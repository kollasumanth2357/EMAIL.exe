import { logger } from '../utils/logger.js';

const log = logger.child('JobQueue');

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobProgress {
  total: number;
  processed: number;
  successful: number;
  failed: number;
  fallback?: number;
  currentStep?: string;
}

export interface Job<T = any, R = any> {
  id: string;
  type: string;
  status: JobStatus;
  payload: T;
  result?: R;
  error?: string;
  progress: JobProgress;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

export class JobQueueService {
  private jobs: Map<string, Job> = new Map();
  private maxStoredJobs = 200;

  /**
   * Submit an asynchronous job to the queue
   */
  public submitJob<T = any, R = any>(
    type: string,
    payload: T,
    worker: (job: Job<T, R>, updateProgress: (progress: Partial<JobProgress>) => void) => Promise<R>
  ): Job<T, R> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const job: Job<T, R> = {
      id,
      type,
      status: 'pending',
      payload,
      progress: {
        total: (payload as any)?.limit || (payload as any)?.total || 0,
        processed: 0,
        successful: 0,
        failed: 0
      },
      createdAt: new Date().toISOString()
    };

    // Trim old jobs if exceeding capacity
    if (this.jobs.size >= this.maxStoredJobs) {
      const oldestKey = this.jobs.keys().next().value;
      if (oldestKey) this.jobs.delete(oldestKey);
    }

    this.jobs.set(id, job);
    log.info(`Job submitted: ${id} (${type})`);

    // Execute asynchronously on the next event loop tick
    setImmediate(async () => {
      job.status = 'processing';
      job.startedAt = new Date().toISOString();
      log.info(`Job started: ${id} (${type})`);

      const updateProgress = (patch: Partial<JobProgress>) => {
        job.progress = { ...job.progress, ...patch };
      };

      try {
        const result = await worker(job, updateProgress);
        job.status = 'completed';
        job.result = result;
        job.completedAt = new Date().toISOString();
        log.info(`Job completed successfully: ${id} (${type})`, {
          processed: job.progress.processed,
          successful: job.progress.successful
        });
      } catch (err: any) {
        job.status = 'failed';
        job.error = err.message || 'Job processing failed';
        job.completedAt = new Date().toISOString();
        log.error(`Job failed: ${id} (${type})`, { error: job.error });
      }
    });

    return job;
  }

  public getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  public listJobs(limit: number = 20): Job[] {
    const list = Array.from(this.jobs.values());
    return list.slice(-limit).reverse();
  }
}

export const queueService = new JobQueueService();
