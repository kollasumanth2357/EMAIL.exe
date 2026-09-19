/**
 * Structured Logging Utility for MailPilot Server
 * Supports levels: DEBUG, INFO, WARN, ERROR
 * Includes ISO timestamps, context tagging, and automatic secret redaction.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVEL_SEVERITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const SENSITIVE_KEYS = new Set([
  'password',
  'password_hash',
  'token',
  'access_token',
  'refresh_token',
  'client_secret',
  'secret',
  'authorization',
  'cookie',
  'apikey',
  'api_key',
  'groq_api_key',
  'openai_api_key',
  'google_client_secret',
  'code'
]);

function redactSensitiveData(obj: any, depth = 0): any {
  if (depth > 5 || obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, depth + 1));
  }

  const redacted: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase()) || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
      redacted[key] = '[REDACTED]';
    } else if (typeof value === 'object') {
      redacted[key] = redactSensitiveData(value, depth + 1);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

export class Logger {
  private context: string;
  private minLevel: LogLevel;

  constructor(context: string = 'Server', minLevel: LogLevel = 'info') {
    this.context = context;
    this.minLevel = (process.env.LOG_LEVEL?.toLowerCase() as LogLevel) || minLevel;
  }

  public child(context: string): Logger {
    return new Logger(context, this.minLevel);
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_SEVERITY[level] >= LOG_LEVEL_SEVERITY[this.minLevel];
  }

  private formatMessage(level: LogLevel, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${this.context}]`;
    if (!meta) {
      return `${prefix} ${message}`;
    }
    const safeMeta = redactSensitiveData(meta);
    return `${prefix} ${message} ${typeof safeMeta === 'object' ? JSON.stringify(safeMeta) : safeMeta}`;
  }

  public debug(message: string, meta?: any): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }

  public info(message: string, meta?: any): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, meta));
    }
  }

  public warn(message: string, meta?: any): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, meta));
    }
  }

  public error(message: string, meta?: any): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, meta));
    }
  }
}

export const logger = new Logger('MailPilot');
