import { Email, SentEmail, UserStyleProfile, Thread } from '../types/index.js';

export const initialStyleProfile: UserStyleProfile = {
  id: 'style_profile_default',
  tone: 'Professional & Direct',
  formality: 'Moderately formal',
  sentence_length: 'Short & concise',
  greeting: 'Hi {name},',
  signoff: 'Regards,\nSai',
  style_description: 'Direct, clear, action-oriented, and polite without fluff. Keeps replies between 2-4 sentences with clear next steps and commitments.',
  learned_from_count: 12,
  characteristics: [
    'Direct & concise',
    'Action-oriented next steps',
    'Polite and professional',
    'Consistent "Hi {name}," greeting',
    'Signature "Regards,\\nSai"'
  ]
};

export const demoSentEmails: SentEmail[] = [
  {
    id: 'sent_01',
    original_email_id: 'inbox_archived_01',
    recipient: 'rahul.verma@techflow.io',
    subject: 'Re: Sprint Retrospective Action Items',
    body: 'Hi Rahul,\n\nThanks for compiling the retro action items. I have reviewed the database index migration proposal and approved the ticket.\n\nLet us review the staging metrics together tomorrow morning.\n\nRegards,\nSai',
    sent_at: '2026-09-18T16:30:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_02',
    original_email_id: 'inbox_archived_02',
    recipient: 'elena.rostova@techflow.io',
    subject: 'Re: Q3 Engineering Goals Alignment',
    body: 'Hi Elena,\n\nI reviewed the updated OKR draft. The timeline for the multi-tenant caching service looks realistic now.\n\nI will present this at the leadership sync on Thursday.\n\nRegards,\nSai',
    sent_at: '2026-09-18T14:15:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_03',
    original_email_id: 'inbox_archived_03',
    recipient: 'david.kim@techflow.io',
    subject: 'Re: Redis Cluster Memory Optimization',
    body: 'Hi David,\n\nGood catch on the key expiration policy. Please proceed with applying the TTL update to staging first.\n\nLet me know once you verify memory usage in Grafana.\n\nRegards,\nSai',
    sent_at: '2026-09-18T11:45:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_04',
    original_email_id: 'inbox_archived_04',
    recipient: 'priya.sharma@techflow.io',
    subject: 'Re: Interview Availability - Tech Lead',
    body: 'Hi Priya,\n\nI can take the system design round on Wednesday at 3:00 PM or Thursday at 11:00 AM.\n\nPlease share the candidate resume and portfolio link beforehand.\n\nRegards,\nSai',
    sent_at: '2026-09-17T17:20:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_05',
    original_email_id: 'inbox_archived_05',
    recipient: 'marcus.vance@techflow.io',
    subject: 'Re: Board Meeting Product Slides',
    body: 'Hi Marcus,\n\nI have updated the latency benchmark slide with our latest Q3 telemetry data. The p99 latency dropped from 240ms to 48ms after the indexing patch.\n\nThe deck is ready for your review.\n\nRegards,\nSai',
    sent_at: '2026-09-17T15:10:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_06',
    original_email_id: 'inbox_archived_06',
    recipient: 'lisa.chen@techflow.io',
    subject: 'Re: Datadog APM License Extension',
    body: 'Hi Lisa,\n\nI reviewed the host count projections for next quarter. The 15% increase is justified given our upcoming European cluster expansion.\n\nI have signed off on the purchase requisition.\n\nRegards,\nSai',
    sent_at: '2026-09-17T10:05:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_07',
    original_email_id: 'inbox_archived_07',
    recipient: 'devon.miles@techflow.io',
    subject: 'Re: PostgreSQL Read Replica Failover Test',
    body: 'Hi Devon,\n\nThe failover drill timing looks fine. Let us schedule it for Saturday 02:00 UTC during our lowest traffic window.\n\nPlease ensure on-call engineers are notified 24 hours in advance.\n\nRegards,\nSai',
    sent_at: '2026-09-16T18:40:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_08',
    original_email_id: 'inbox_archived_08',
    recipient: 'sarah.jenkins@techflow.io',
    subject: 'Re: SOC2 Type II Audit Evidence Collection',
    body: 'Hi Sarah,\n\nAll pull request review logs and AWS CloudTrail audit reports for August have been exported to the compliance drive.\n\nPlease let me know if the auditors require any additional access tokens.\n\nRegards,\nSai',
    sent_at: '2026-09-16T13:25:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_09',
    original_email_id: 'inbox_archived_09',
    recipient: 'rachel.green@techflow.io',
    subject: 'Re: Enterprise SLA Inquiry - Acme Corp',
    body: 'Hi Rachel,\n\nI verified the incident log from Tuesday. The disruption lasted 4 minutes and was isolated to their sandbox environment, so SLA credit does not apply.\n\nI drafted an incident explanation you can share with their CTO.\n\nRegards,\nSai',
    sent_at: '2026-09-15T16:50:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_10',
    original_email_id: 'inbox_archived_10',
    recipient: 'alex.rivera@techflow.io',
    subject: 'Re: Webhook Event Duplication Fix',
    body: 'Hi Alex,\n\nIdempotency keys on the incoming payload will solve this permanently. Let us prioritize the PR for this sprint.\n\nI will review your branch as soon as the unit tests pass.\n\nRegards,\nSai',
    sent_at: '2026-09-15T11:15:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_11',
    original_email_id: 'inbox_archived_11',
    recipient: 'maya.patel@techflow.io',
    subject: 'Re: Design System Token Migration',
    body: 'Hi Maya,\n\nThe frontend team will begin adopting the Tailwind token package starting next Monday.\n\nLet us have a quick 15-minute handoff call on Friday to align on color palette variables.\n\nRegards,\nSai',
    sent_at: '2026-09-14T14:30:00.000Z',
    status: 'Sent'
  },
  {
    id: 'sent_12',
    original_email_id: 'inbox_archived_12',
    recipient: 'carlos.mendoza@techflow.io',
    subject: 'Re: FastSync Engine Launch Celebration',
    body: 'Hi Carlos,\n\nCongratulations to you and the team on shipping FastSync! The throughput gains are remarkable.\n\nLet us grab team dinner next Wednesday to celebrate.\n\nRegards,\nSai',
    sent_at: '2026-09-14T09:45:00.000Z',
    status: 'Sent'
  }
];

export const demoEmails: Email[] = [
  // 1. URGENT (Multi-message thread: Prof. Kumar / Project Deadline)
  {
    id: 'email_01',
    thread_id: 'thread_01',
    sender: 'p.kumar@university.edu',
    sender_name: 'Prof. Kumar',
    recipient: 'sai@techflow.io',
    subject: 'CRITICAL: Final Project Submission & Demo Schedule Moved to Friday',
    body: 'Dear Sai and Rahul,\n\nPlease note that due to academic council scheduling, the final project demonstration and code repository submission deadline has been advanced to Friday, 5:00 PM EST.\n\nAll end-to-end testing must be completed by Thursday evening. Late submissions cannot be accommodated.\n\nPlease confirm that your team has received this and that your pipeline is on track.\n\nBest regards,\nProf. Kumar',
    timestamp: '2026-09-19T07:42:00.000Z',
    priority: 'Urgent',
    topic: 'Action Required',
    summary: 'The final project submission deadline has moved to Friday.\nFinal testing must be completed before Thursday evening.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T07:42:00.000Z',
    messages: [
      {
        id: 'msg_01_1',
        thread_id: 'thread_01',
        sender: 'p.kumar@university.edu',
        sender_name: 'Prof. Kumar',
        recipient: 'sai@techflow.io, rahul@techflow.io',
        subject: 'Final Project Submission & Demo Schedule',
        body: 'Hello team, the evaluation panel has scheduled presentations for next week. Please send over your draft architecture report by Wednesday.',
        timestamp: '2026-09-18T10:00:00.000Z'
      },
      {
        id: 'msg_01_2',
        thread_id: 'thread_01',
        sender: 'rahul.verma@techflow.io',
        sender_name: 'Rahul Verma',
        recipient: 'p.kumar@university.edu, sai@techflow.io',
        subject: 'Re: Final Project Submission & Demo Schedule',
        body: 'Prof. Kumar, we have completed the core data pipelines and are wrapping up the triage dashboard. We will share the preview link shortly.',
        timestamp: '2026-09-18T14:20:00.000Z'
      },
      {
        id: 'msg_01_3',
        thread_id: 'thread_01',
        sender: 'p.kumar@university.edu',
        sender_name: 'Prof. Kumar',
        recipient: 'sai@techflow.io, rahul@techflow.io',
        subject: 'CRITICAL: Final Project Submission & Demo Schedule Moved to Friday',
        body: 'Dear Sai and Rahul,\n\nPlease note that due to academic council scheduling, the final project demonstration and code repository submission deadline has been advanced to Friday, 5:00 PM EST.\n\nAll end-to-end testing must be completed by Thursday evening. Late submissions cannot be accommodated.\n\nPlease confirm that your team has received this and that your pipeline is on track.\n\nBest regards,\nProf. Kumar',
        timestamp: '2026-09-19T07:42:00.000Z'
      }
    ]
  },

  // 2. URGENT (Multi-message thread: Payment Gateway Outage)
  {
    id: 'email_02',
    thread_id: 'thread_02',
    sender: 'alex.rivera@techflow.io',
    sender_name: 'Alex Rivera',
    recipient: 'sai@techflow.io',
    subject: 'URGENT: Stripe Webhook 500 Spike in US-East-1 Production',
    body: 'Hi Sai,\n\nWe are seeing a 42% failure rate on incoming Stripe webhook events over the last 20 minutes. Customers upgrading to Tier 3 are stuck in pending state.\n\nDevon and I are triaging the worker queue now. We need your approval to temporarily throttle retry events and apply the hotfix branch hotfix/stripe-sig-timeout.\n\nPlease advise immediately.\n\nAlex Rivera\nSenior Backend Engineer',
    timestamp: '2026-09-19T07:15:00.000Z',
    priority: 'Urgent',
    topic: 'Action Required',
    summary: 'Stripe webhook failures spiked to 42% in US-East-1 production.\nAlex requires immediate approval to deploy the hotfix branch.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T07:15:00.000Z',
    messages: [
      {
        id: 'msg_02_1',
        thread_id: 'thread_02',
        sender: 'devon.miles@techflow.io',
        sender_name: 'Devon Miles',
        recipient: 'alex.rivera@techflow.io, sai@techflow.io',
        subject: 'Alert: Stripe webhook latency elevated',
        body: 'Noticing p99 response times on /api/webhooks/stripe exceeding 4000ms. Investigating connection pool.',
        timestamp: '2026-09-19T06:55:00.000Z'
      },
      {
        id: 'msg_02_2',
        thread_id: 'thread_02',
        sender: 'alex.rivera@techflow.io',
        sender_name: 'Alex Rivera',
        recipient: 'sai@techflow.io',
        subject: 'URGENT: Stripe Webhook 500 Spike in US-East-1 Production',
        body: 'Hi Sai,\n\nWe are seeing a 42% failure rate on incoming Stripe webhook events over the last 20 minutes. Customers upgrading to Tier 3 are stuck in pending state.\n\nDevon and I are triaging the worker queue now. We need your approval to temporarily throttle retry events and apply the hotfix branch hotfix/stripe-sig-timeout.\n\nPlease advise immediately.\n\nAlex Rivera\nSenior Backend Engineer',
        timestamp: '2026-09-19T07:15:00.000Z'
      }
    ]
  },

  // 3. URGENT: Board Deck Sign-off
  {
    id: 'email_03',
    thread_id: 'thread_03',
    sender: 'marcus.vance@techflow.io',
    sender_name: 'Marcus Vance (CEO)',
    recipient: 'sai@techflow.io',
    subject: 'Urgent: Board Deck Engineering Milestones Sign-off before 2 PM',
    body: 'Sai,\n\nThe board meeting is at 3:00 PM today. I need your final sign-off on Slide 14 (Q3 Platform Reliability & AI Roadmap).\n\nSpecifically verify that our 99.98% uptime claim and the launch of the AI Email Triage Assistant are locked in.\n\nPlease reply with your confirmation or any required edits before 2:00 PM.\n\nMarcus',
    timestamp: '2026-09-19T06:30:00.000Z',
    priority: 'Urgent',
    topic: 'Action Required',
    summary: 'Marcus needs final sign-off on Board Deck Slide 14 before 2 PM.\nRequires verification of 99.98% uptime and AI triage delivery.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T06:30:00.000Z'
  },

  // 4. ACTION REQUIRED: Pull Request Architecture Review
  {
    id: 'email_04',
    thread_id: 'thread_04',
    sender: 'david.kim@techflow.io',
    sender_name: 'David Kim',
    recipient: 'sai@techflow.io',
    subject: 'Review Required: PR #412 Multi-tenant Caching & Invalidation Layer',
    body: 'Hi Sai,\n\nI just pushed the multi-tenant caching layer PR (#412). It introduces redis pipeline clustering and handles tenant key isolation.\n\nCould you please review the cache invalidation logic in src/cache/invalidation.ts when you get a chance? We want to merge this ahead of the sprint cut.\n\nLink: https://github.com/techflow/engine/pull/412\n\nThanks,\nDavid',
    timestamp: '2026-09-19T05:50:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'David requested your architectural review on PR #412 for Redis caching.\nFocus area is cache invalidation logic before the sprint cut.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T05:50:00.000Z'
  },

  // 5. ACTION REQUIRED: Candidate Interview Evaluation (Thread)
  {
    id: 'email_05',
    thread_id: 'thread_05',
    sender: 'priya.sharma@techflow.io',
    sender_name: 'Priya Sharma',
    recipient: 'sai@techflow.io',
    subject: 'Interview Feedback Form: Senior Full Stack Engineer (Amit Sen)',
    body: 'Hi Sai,\n\nThank you for conducting the technical deep-dive round with Amit Sen yesterday afternoon.\n\nThe hiring committee meets at 4:30 PM today to decide on an offer. Please submit your scorecard and recommendation on Greenhouse before 3:30 PM.\n\nLet me know if you need his code challenge repository re-opened.\n\nBest,\nPriya',
    timestamp: '2026-09-19T05:15:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Priya needs your interview scorecard for candidate Amit Sen by 3:30 PM.\nThe hiring committee meets at 4:30 PM today for the offer decision.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T05:15:00.000Z',
    messages: [
      {
        id: 'msg_05_1',
        thread_id: 'thread_05',
        sender: 'priya.sharma@techflow.io',
        sender_name: 'Priya Sharma',
        recipient: 'sai@techflow.io',
        subject: 'Interview Scheduled: Amit Sen (Senior Full Stack)',
        body: 'Candidate interview scheduled for Thursday 4:00 PM. Greenhouse rubric attached.',
        timestamp: '2026-09-17T09:00:00.000Z'
      },
      {
        id: 'msg_05_2',
        thread_id: 'thread_05',
        sender: 'priya.sharma@techflow.io',
        sender_name: 'Priya Sharma',
        recipient: 'sai@techflow.io',
        subject: 'Interview Feedback Form: Senior Full Stack Engineer (Amit Sen)',
        body: 'Hi Sai,\n\nThank you for conducting the technical deep-dive round with Amit Sen yesterday afternoon.\n\nThe hiring committee meets at 4:30 PM today to decide on an offer. Please submit your scorecard and recommendation on Greenhouse before 3:30 PM.\n\nLet me know if you need his code challenge repository re-opened.\n\nBest,\nPriya',
        timestamp: '2026-09-19T05:15:00.000Z'
      }
    ]
  },

  // 6. ACTION REQUIRED: Budget Approval
  {
    id: 'email_06',
    thread_id: 'thread_06',
    sender: 'lisa.chen@techflow.io',
    sender_name: 'Lisa Chen (VP Eng)',
    recipient: 'sai@techflow.io',
    subject: 'Approval Needed: Q3 Cloud GPU Cluster Provisioning ($8,400/mo)',
    body: 'Hi Sai,\n\nI reviewed your team proposal for provisioning dedicated H100 GPU instances for model fine-tuning and inference pipelines. The total monthly commitment is $8,400.\n\nPlease confirm in writing that this replaces our current third-party hosted inference spend and that finance can approve the procurement order.\n\nThanks,\nLisa',
    timestamp: '2026-09-19T04:40:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Lisa requested written confirmation for the $8,400/mo GPU cluster.\nRequires validation that it replaces third-party inference costs.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T04:40:00.000Z'
  },

  // 7. ACTION REQUIRED: SOC2 Vendor Security Assessment
  {
    id: 'email_07',
    thread_id: 'thread_07',
    sender: 'sarah.jenkins@techflow.io',
    sender_name: 'Sarah Jenkins (Security)',
    recipient: 'sai@techflow.io',
    subject: 'Action Required: Sign-off on LangSmith Vendor Security Review',
    body: 'Hi Sai,\n\nOur infosec team has completed the annual SOC2 compliance audit for LangSmith and OpenAI telemetry integrations. There are two low-risk findings regarding PII data masking in prompt payloads.\n\nPlease review the remediation items in section 4 and add your approval stamp so we can unblock the enterprise contract.\n\nRegards,\nSarah Jenkins',
    timestamp: '2026-09-19T03:55:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Security completed the LangSmith vendor review with two low-risk items.\nNeeds your review of section 4 remediation and sign-off.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T03:55:00.000Z'
  },

  // 8. ACTION REQUIRED: Client Contract Renewal Amendment
  {
    id: 'email_08',
    thread_id: 'thread_08',
    sender: 'jordan.bell@techflow.io',
    sender_name: 'Jordan Bell (Legal)',
    recipient: 'sai@techflow.io',
    subject: 'Technical Exhibit Review: Meridian Health Enterprise MSA',
    body: 'Hi Sai,\n\nMeridian Health requested a customized SLA clause guaranteeing 99.95% API uptime with 1-hour P1 support resolution.\n\nCan you verify if our current on-call rotation and monitoring tooling can safely guarantee this without penal risk?\n\nLet me know by noon today.\n\nJordan Bell',
    timestamp: '2026-09-19T03:10:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Legal needs verification on Meridian Health 99.95% SLA terms.\nConfirm whether our on-call rotation can meet the 1-hour P1 target.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T03:10:00.000Z'
  },

  // 9. ACTION REQUIRED: Production Runbook Verification (Thread)
  {
    id: 'email_09',
    thread_id: 'thread_09',
    sender: 'devon.miles@techflow.io',
    sender_name: 'Devon Miles (SRE)',
    recipient: 'sai@techflow.io',
    subject: 'Runbook Sign-off: Zero-Downtime PostgreSQL 16 Major Upgrade',
    body: 'Hi Sai,\n\nAttached is the updated rollback runbook for our Postgres 16 migration scheduled for Sunday. We have incorporated the pg_upgrade logical replication fallback.\n\nPlease review step 6 (data reconciliation check) and confirm we are good to proceed.\n\nDevon',
    timestamp: '2026-09-19T02:20:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Devon sent the Postgres 16 zero-downtime migration runbook.\nRequires sign-off on step 6 data reconciliation before Sunday.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T02:20:00.000Z',
    messages: [
      {
        id: 'msg_09_1',
        thread_id: 'thread_09',
        sender: 'devon.miles@techflow.io',
        sender_name: 'Devon Miles',
        recipient: 'sai@techflow.io',
        subject: 'Postgres 16 upgrade draft plan',
        body: 'Initial draft for the upgrade procedure. Reviewing zero-downtime constraints.',
        timestamp: '2026-09-16T11:00:00.000Z'
      },
      {
        id: 'msg_09_2',
        thread_id: 'thread_09',
        sender: 'devon.miles@techflow.io',
        sender_name: 'Devon Miles',
        recipient: 'sai@techflow.io',
        subject: 'Runbook Sign-off: Zero-Downtime PostgreSQL 16 Major Upgrade',
        body: 'Hi Sai,\n\nAttached is the updated rollback runbook for our Postgres 16 migration scheduled for Sunday. We have incorporated the pg_upgrade logical replication fallback.\n\nPlease review step 6 (data reconciliation check) and confirm we are good to proceed.\n\nDevon',
        timestamp: '2026-09-19T02:20:00.000Z'
      }
    ]
  },

  // 10. ACTION REQUIRED: Enterprise SLA Customer Escalation
  {
    id: 'email_10',
    thread_id: 'thread_10',
    sender: 'rachel.green@techflow.io',
    sender_name: 'Rachel Green (Customer Success)',
    recipient: 'sai@techflow.io',
    subject: 'Escalation: Apex Global API Latency & Ingestion Delay',
    body: 'Hi Sai,\n\nApex Global account director reported that their daily batch ingestion took 45 minutes instead of the usual 8 minutes this morning.\n\nCould your team check if the background indexing job ran during their sync window? They are asking for a quick post-mortem summary by end of day.\n\nThanks,\nRachel',
    timestamp: '2026-09-19T01:40:00.000Z',
    priority: 'Normal',
    topic: 'Action Required',
    summary: 'Apex Global experienced ingestion delays (45 mins vs 8 mins normal).\nRachel requested an investigation and post-mortem summary by EOD.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-19T01:40:00.000Z'
  },

  // 11. WORK: Q3 Product Strategy Review (Thread)
  {
    id: 'email_11',
    thread_id: 'thread_11',
    sender: 'elena.rostova@techflow.io',
    sender_name: 'Elena Rostova',
    recipient: 'sai@techflow.io',
    subject: 'Q3 Product Roadmap Review & Executive Deck',
    body: 'Hi Sai,\n\nThank you for preparing the technical feasibility breakdown for the intelligent email assistant. The product leadership committee was very impressed with the five-minute morning routine narrative.\n\nWe have scheduled the roadshow presentation for next Tuesday.\n\nBest,\nElena',
    timestamp: '2026-09-18T22:15:00.000Z',
    priority: 'Normal',
    topic: 'Work',
    summary: 'Product leadership endorsed the AI email assistant concept.\nThe executive roadshow presentation is confirmed for next Tuesday.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-18T22:15:00.000Z',
    messages: [
      {
        id: 'msg_11_1',
        thread_id: 'thread_11',
        sender: 'elena.rostova@techflow.io',
        sender_name: 'Elena Rostova',
        recipient: 'sai@techflow.io',
        subject: 'Q3 Roadmap kickoff',
        body: 'Looking forward to reviewing the AI workspace features and timeline.',
        timestamp: '2026-09-17T14:00:00.000Z'
      },
      {
        id: 'msg_11_2',
        thread_id: 'thread_11',
        sender: 'sai@techflow.io',
        sender_name: 'Sai Kumar',
        recipient: 'elena.rostova@techflow.io',
        subject: 'Re: Q3 Roadmap kickoff',
        body: 'Hi Elena, I compiled the feasibility notes and latency benchmarks. Ready for review.',
        timestamp: '2026-09-17T16:30:00.000Z'
      },
      {
        id: 'msg_11_3',
        thread_id: 'thread_11',
        sender: 'elena.rostova@techflow.io',
        sender_name: 'Elena Rostova',
        recipient: 'sai@techflow.io',
        subject: 'Q3 Product Roadmap Review & Executive Deck',
        body: 'Hi Sai,\n\nThank you for preparing the technical feasibility breakdown for the intelligent email assistant. The product leadership committee was very impressed with the five-minute morning routine narrative.\n\nWe have scheduled the roadshow presentation for next Tuesday.\n\nBest,\nElena',
        timestamp: '2026-09-18T22:15:00.000Z'
      }
    ]
  },

  // 12. WORK: Sprint Planning Notes
  {
    id: 'email_12',
    thread_id: 'thread_12',
    sender: 'scrum-master@techflow.io',
    sender_name: 'Agile Ops',
    recipient: 'engineering@techflow.io',
    subject: 'Sprint 24 Planning Summary & Commitment Goals',
    body: 'Hi Engineering Team,\n\nSprint 24 commitments have been locked into Jira. Total committed story points: 84 across 12 feature items and 4 tech-debt tickets.\n\nKey deliverables include AI tone personalization, inbox bulk triage, and Supabase row-level security policies.\n\nHappy coding!',
    timestamp: '2026-09-18T20:30:00.000Z',
    priority: 'Normal',
    topic: 'Work',
    summary: 'Sprint 24 committed to 84 story points across 16 tickets.\nCore targets include tone personalization and Supabase RLS policies.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T20:30:00.000Z'
  },

  // 13. WORK: Design System Token Migration
  {
    id: 'email_13',
    thread_id: 'thread_13',
    sender: 'maya.patel@techflow.io',
    sender_name: 'Maya Patel (Design Lead)',
    recipient: 'sai@techflow.io',
    subject: 'Figma Design System V3 Component Library Release',
    body: 'Hi Sai,\n\nWe just published the updated V3 Design Tokens package to npm (@techflow/tokens@3.0.0). It includes refined dark mode surface colors, accessible badge contrasts, and streamlined typography scales.\n\nLet me know if your team notices any issues during integration.\n\nMaya',
    timestamp: '2026-09-18T18:50:00.000Z',
    priority: 'Normal',
    topic: 'Work',
    summary: 'Design Ops published the V3 Design Tokens package with dark mode tokens.\nReady for integration into upcoming frontend pull requests.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T18:50:00.000Z'
  },

  // 14. WORK: Infrastructure Cost Optimization
  {
    id: 'email_14',
    thread_id: 'thread_14',
    sender: 'devon.miles@techflow.io',
    sender_name: 'Devon Miles (SRE)',
    recipient: 'sai@techflow.io',
    subject: 'AWS Cost Optimization Progress: $3,200/mo Saved',
    body: 'Hi Sai,\n\nQuick update on our AWS rightsizing initiative: by terminating idle NAT gateways and converting non-prod RDS instances to Aurora Serverless v2, we have shaved $3,200/month off our cloud bill.\n\nDetailed breakdown attached in Google Sheets.\n\nBest,\nDevon',
    timestamp: '2026-09-18T17:10:00.000Z',
    priority: 'Low',
    topic: 'Work',
    summary: 'AWS rightsizing initiative reduced infrastructure spend by $3,200/month.\nAchieved via NAT gateway consolidation and Aurora Serverless v2.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T17:10:00.000Z'
  },

  // 15. WORK: Architecture Sync Notes
  {
    id: 'email_15',
    thread_id: 'thread_15',
    sender: 'david.kim@techflow.io',
    sender_name: 'David Kim',
    recipient: 'sai@techflow.io',
    subject: 'Architecture Sync Notes: Event-Driven Email Ingestion Pipeline',
    body: 'Hi Sai,\n\nHere are the notes from our Thursday architecture whiteboarding session. We aligned on using SSE (Server-Sent Events) for real-time triage progress updates on the client rather than polling.\n\nFull diagram is saved in Miro: https://miro.com/techflow/arch-v2\n\nDavid',
    timestamp: '2026-09-18T15:40:00.000Z',
    priority: 'Low',
    topic: 'Work',
    summary: 'Whiteboard notes aligned on Server-Sent Events for real-time triage updates.\nArchitecture diagram and spec saved in Miro.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T15:40:00.000Z'
  },

  // 16. WORK: Team Kudos
  {
    id: 'email_16',
    thread_id: 'thread_16',
    sender: 'carlos.mendoza@techflow.io',
    sender_name: 'Carlos Mendoza',
    recipient: 'all-engineering@techflow.io',
    subject: 'Team Kudos: Shipped the FastSync Engine with Zero Downtime!',
    body: 'Huge congratulations to Sai, Devon, and Alex! The FastSync ingestion engine went live this afternoon without a single dropped packet. Processing time per inbox dropped from 14s to 1.2s.\n\nIncredible team effort!',
    timestamp: '2026-09-18T13:00:00.000Z',
    priority: 'Low',
    topic: 'Work',
    summary: 'Team celebration for launching the FastSync engine with zero downtime.\nInbox processing latency improved from 14 seconds to 1.2 seconds.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T13:00:00.000Z'
  },

  // 17. PERSONAL: Lunch Sync
  {
    id: 'email_17',
    thread_id: 'thread_17',
    sender: 'maya.patel@techflow.io',
    sender_name: 'Maya Patel',
    recipient: 'sai@techflow.io',
    subject: 'Lunch at the Thai place tomorrow?',
    body: 'Hey Sai! A few of us from design and product are heading to Thai Orchid at 12:30 PM tomorrow to celebrate the design tokens launch. Would love if you could join us!\n\nLet me know,\nMaya',
    timestamp: '2026-09-18T11:20:00.000Z',
    priority: 'Low',
    topic: 'Personal',
    summary: 'Maya invited you to join design and product team lunch tomorrow.\nMeeting at Thai Orchid at 12:30 PM.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-18T11:20:00.000Z'
  },

  // 18. PERSONAL: Weekend Hiking Plan
  {
    id: 'email_18',
    thread_id: 'thread_18',
    sender: 'arjun.rao@gmail.com',
    sender_name: 'Arjun Rao',
    recipient: 'sai@techflow.io',
    subject: 'Mount Tamalpais Sunrise Hike this Saturday',
    body: 'Hey Sai,\n\nWe are doing the Dipsea trail up to Mount Tam this Saturday morning. Leaving the base parking lot at 6:30 AM to catch the ocean fog layer before sunrise. Let me know if you are in and want to carpool!\n\nCheers,\nArjun',
    timestamp: '2026-09-17T21:10:00.000Z',
    priority: 'Low',
    topic: 'Personal',
    summary: 'Arjun invited you to the Dipsea trail sunrise hike this Saturday.\nCarpool departs from the base parking lot at 6:30 AM.',
    is_read: false,
    status: 'inbox',
    created_at: '2026-09-17T21:10:00.000Z'
  },

  // 19. PERSONAL: College Alumni Meet
  {
    id: 'email_19',
    thread_id: 'thread_19',
    sender: 'alumni-relations@university.edu',
    sender_name: 'Alumni Network',
    recipient: 'sai@techflow.io',
    subject: 'Annual Engineering Alumni Meetup & Mentorship Mixer',
    body: 'Dear Sai,\n\nYou are cordially invited to our Fall Alumni Mentorship Mixer on October 14th at the Innovation Center. Over 150 computer science graduates and startup founders will gather for an evening of networking and lightning talks.\n\nRSVP link enclosed.',
    timestamp: '2026-09-17T14:45:00.000Z',
    priority: 'Low',
    topic: 'Personal',
    summary: 'Invitation to the Fall Alumni Mentorship Mixer on October 14th.\nNetworking event for CS graduates and tech founders.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-17T14:45:00.000Z'
  },

  // 20. NEWSLETTER: Node.js & TypeScript Weekly
  {
    id: 'email_20',
    thread_id: 'thread_20',
    sender: 'digest@nodeweekly.com',
    sender_name: 'Node Weekly',
    recipient: 'sai@techflow.io',
    subject: 'Node Weekly #582: High-Performance Streams, Node 22 Features',
    body: 'Welcome to this week edition of Node Weekly.\n\nTop stories:\n- Deep dive into Node 22 built-in WebSocket client\n- Zero-copy stream processing in microservices\n- Why SQLite + WAL mode is winning embedded application benchmarks\n\nClick to read online.',
    timestamp: '2026-09-18T09:15:00.000Z',
    priority: 'Low',
    topic: 'Newsletter',
    summary: 'Node Weekly featured articles on Node 22 WebSockets and stream performance.\nIncludes benchmark analysis on embedded SQLite WAL modes.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T09:15:00.000Z'
  },

  // 21. NEWSLETTER: TLDR Tech
  {
    id: 'email_21',
    thread_id: 'thread_21',
    sender: 'dan@tldr.tech',
    sender_name: 'TLDR Tech',
    recipient: 'sai@techflow.io',
    subject: 'TLDR Tech: The Rise of Autonomous AI Coding Agents',
    body: 'TLDR Daily Tech Briefing.\n\nBig Tech & Startups:\n- AI coding assistants shift from completion to end-to-end agentic pair programming\n- Open-weights reasoning models reach parity on SWE-bench\n- Quantum error correction milestone announced by national labs\n\nSponsor spotlight: Scale your vector database with zero cold starts.',
    timestamp: '2026-09-17T12:00:00.000Z',
    priority: 'Low',
    topic: 'Newsletter',
    summary: 'TLDR covered autonomous AI coding agents and new reasoning model benchmarks.\nHighlights recent advances in agentic software engineering workflows.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-17T12:00:00.000Z'
  },

  // 22. NEWSLETTER: Product Hunt Daily
  {
    id: 'email_22',
    thread_id: 'thread_22',
    sender: 'hello@producthunt.com',
    sender_name: 'Product Hunt',
    recipient: 'sai@techflow.io',
    subject: 'Top 10 Developer Productivity Tools You Need in 2026',
    body: 'Today most upvoted launches:\n1. MailPilot - Turn inbox overload into a 5-minute routine\n2. GitStream - Instant automated code review insights\n3. MockMesh - Synthetic API test generator\n\nCheck out the maker community discussions.',
    timestamp: '2026-09-16T15:30:00.000Z',
    priority: 'Low',
    topic: 'Newsletter',
    summary: 'Product Hunt daily top launches featured MailPilot and developer tools.\nTrending discussions around autonomous workflow automation.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-16T15:30:00.000Z'
  },

  // 23. OTHER / NOTIFICATION: AWS Budgets
  {
    id: 'email_23',
    thread_id: 'thread_23',
    sender: 'no-reply@amazon.com',
    sender_name: 'AWS Budgets Alert',
    recipient: 'sai@techflow.io',
    subject: 'Notification: TechFlow-Prod Account Budget Threshold Reached (82%)',
    body: 'AWS Budget Alert: You have exceeded 80% of your forecasted monthly budget for TechFlow-Prod ($12,000 threshold). Current month-to-date spend is $9,842.10. Forecasted end-of-month spend is $11,920.00. No immediate action required.',
    timestamp: '2026-09-18T08:00:00.000Z',
    priority: 'Low',
    topic: 'Other',
    summary: 'AWS monthly budget reached 82% ($9,842 of $12,000 threshold).\nForecast indicates total spend will remain within planned limit.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-18T08:00:00.000Z'
  },

  // 24. OTHER / NOTIFICATION: GitHub Security Alert
  {
    id: 'email_24',
    thread_id: 'thread_24',
    sender: 'notifications@github.com',
    sender_name: 'GitHub Dependabot',
    recipient: 'sai@techflow.io',
    subject: '[techflow/engine] Dependabot alert: Moderate severity vulnerability in micromatch',
    body: 'Dependabot detected a moderate severity vulnerability in micromatch (<4.0.8) affecting package-lock.json. An automated pull request #415 has been opened with the fix. Please merge at your convenience.',
    timestamp: '2026-09-17T19:20:00.000Z',
    priority: 'Low',
    topic: 'Other',
    summary: 'GitHub Dependabot flagged moderate micromatch vulnerability.\nAutomated pull request #415 is ready for merge.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-17T19:20:00.000Z'
  },

  // 25. OTHER / NOTIFICATION: Google Drive Share
  {
    id: 'email_25',
    thread_id: 'thread_25',
    sender: 'drive-shares-noreply@google.com',
    sender_name: 'Google Drive',
    recipient: 'sai@techflow.io',
    subject: 'Lisa Chen shared "Q4 Enterprise Customer Projections" with you',
    body: 'Lisa Chen (lisa.chen@techflow.io) has shared the following spreadsheet with you: "Q4 Enterprise Customer Projections.xlsx". Permission: Commenter. Click here to open.',
    timestamp: '2026-09-17T10:40:00.000Z',
    priority: 'Low',
    topic: 'Other',
    summary: 'Lisa Chen shared the Q4 Enterprise Customer Projections spreadsheet.\nView permissions granted for commentary.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-17T10:40:00.000Z'
  },

  // 26. OTHER / NOTIFICATION: Stripe Payout
  {
    id: 'email_26',
    thread_id: 'thread_26',
    sender: 'notifications@stripe.com',
    sender_name: 'Stripe Notifications',
    recipient: 'sai@techflow.io',
    subject: 'Your daily payout of $48,290.50 has been submitted',
    body: 'A payout of $48,290.50 USD is on its way to your Silicon Valley Bank account ending in 4108. Expected deposit arrival: September 20, 2026.',
    timestamp: '2026-09-16T18:00:00.000Z',
    priority: 'Low',
    topic: 'Other',
    summary: 'Stripe submitted daily payout of $48,290.50 to company bank account.\nDeposit expected to settle on September 20, 2026.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-16T18:00:00.000Z'
  },

  // 27. OTHER: Office Facility Maintenance
  {
    id: 'email_27',
    thread_id: 'thread_27',
    sender: 'facilities@techflow.io',
    sender_name: 'TechFlow Workplace Operations',
    recipient: 'all-hq@techflow.io',
    subject: 'Scheduled HVAC & Fiber Network Maintenance this Sunday',
    body: 'Please be advised that the 4th floor HQ building will undergo scheduled HVAC filter replacement and secondary fiber switch firmware upgrades this Sunday from 08:00 to 14:00 PST. Office badges will be temporarily deactivated during this window.',
    timestamp: '2026-09-16T14:10:00.000Z',
    priority: 'Low',
    topic: 'Other',
    summary: 'HQ building scheduled HVAC and fiber maintenance on Sunday.\nAccess badges temporarily inactive between 8 AM and 2 PM PST.',
    is_read: true,
    status: 'inbox',
    created_at: '2026-09-16T14:10:00.000Z'
  }
];

export const demoThreads: Thread[] = [
  {
    id: 'thread_01',
    subject: 'CRITICAL: Final Project Submission & Demo Schedule Moved to Friday',
    summary: 'The final project submission deadline has moved to Friday.\nFinal testing must be completed before Thursday evening.',
    message_count: 3,
    last_message_at: '2026-09-19T07:42:00.000Z',
    messages: demoEmails[0].messages || []
  },
  {
    id: 'thread_02',
    subject: 'URGENT: Stripe Webhook 500 Spike in US-East-1 Production',
    summary: 'Stripe webhook failures spiked to 42% in US-East-1 production.\nAlex requires immediate approval to deploy the hotfix branch.',
    message_count: 2,
    last_message_at: '2026-09-19T07:15:00.000Z',
    messages: demoEmails[1].messages || []
  },
  {
    id: 'thread_05',
    subject: 'Interview Feedback Form: Senior Full Stack Engineer (Amit Sen)',
    summary: 'Priya needs your interview scorecard for candidate Amit Sen by 3:30 PM.\nThe hiring committee meets at 4:30 PM today for the offer decision.',
    message_count: 2,
    last_message_at: '2026-09-19T05:15:00.000Z',
    messages: demoEmails[4].messages || []
  },
  {
    id: 'thread_09',
    subject: 'Runbook Sign-off: Zero-Downtime PostgreSQL 16 Major Upgrade',
    summary: 'Devon sent the Postgres 16 zero-downtime migration runbook.\nRequires sign-off on step 6 data reconciliation before Sunday.',
    message_count: 2,
    last_message_at: '2026-09-19T02:20:00.000Z',
    messages: demoEmails[8].messages || []
  },
  {
    id: 'thread_11',
    subject: 'Q3 Product Roadmap Review & Executive Deck',
    summary: 'Product leadership endorsed the AI email assistant concept.\nThe executive roadshow presentation is confirmed for next Tuesday.',
    message_count: 3,
    last_message_at: '2026-09-18T22:15:00.000Z',
    messages: demoEmails[10].messages || []
  }
];
