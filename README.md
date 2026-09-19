# MailPilot — AI Email Inbox Triage & Draft Assistant

> **Turn inbox overload into a five-minute morning routine.**

MailPilot is an AI-powered email productivity application that intelligently triages emails, summarizes conversations, learns a user's communication style, generates contextual reply drafts, and integrates with Gmail for real email synchronization.

The system combines **AI assistance with human approval**: AI handles the repetitive work of understanding and drafting emails, while the user reviews, edits, and approves the final response before it is sent.

---

## 1. Problem Statement

Professionals and knowledge workers receive large numbers of emails every day. Manually identifying urgent messages, understanding long conversations, and writing appropriate replies consumes significant time.

Traditional email applications provide folders, filters, and search, but they do not always understand:

- Which emails require immediate attention
- What a long conversation is actually about
- Whether an email requires an action
- How the user normally communicates
- What an appropriate contextual response should look like

MailPilot addresses this problem by combining:

**AI-powered inbox triage + thread summarization + personalized drafting + human approval.**

The project follows the original hackathon objective of ingesting inbox data, categorizing emails by priority and topic, producing concise thread summaries, and generating replies based on the user's writing style. :contentReference[oaicite:3]{index=3}

---

# 2. Solution

MailPilot transforms an unorganized inbox into an AI-assisted workflow:

```text
                     ┌──────────────────┐
                     │ Gmail / Demo Data│
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │ Email Ingestion  │
                     └────────┬─────────┘
                              │
                              ▼
                     ┌──────────────────┐
                     │   AI Triage      │
                     └────────┬─────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          Priority          Topic          Summary
        Classification   Classification   Generation
              │               │               │
              └───────────────┼───────────────┘
                              ▼
                    ┌──────────────────┐
                    │ Context Analysis │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Style-Aware AI   │
                    │ Reply Generation │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Editable Draft   │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ User Approval    │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Gmail / Demo Send│
                    └──────────────────┘
```

---

# 3. Objectives

The primary objectives of MailPilot are:

1. Automatically organize incoming emails.
2. Identify email priority.
3. Classify emails by topic.
4. Summarize multi-message conversations.
5. Learn the user's communication style.
6. Generate contextual replies.
7. Allow users to edit AI-generated drafts.
8. Require human approval before sending.
9. Provide a realistic email dashboard.
10. Support real Gmail synchronization.
11. Provide a safe Demo Mode for evaluation.
12. Handle Gmail API limits and synchronization failures gracefully.

---

# 4. Core Features

## 4.1 Inbox Data Import

MailPilot supports sample email ingestion for demonstration and evaluation.

Supported workflows include:

- Demo mailbox data
- Sample email datasets
- CSV/JSON-based import workflows
- Real Gmail synchronization

The application includes a curated Enron-derived demo dataset for realistic professional email conversations.

The original SRS explicitly requires an inbox upload/import or demo mailbox workflow. :contentReference[oaicite:4]{index=4}

---

# 5. AI-Based Email Categorization

MailPilot automatically categorizes emails using AI.

## Priority Classification

Each email can be classified as:

- **Urgent**
- **Normal**
- **Low**

## Topic Classification

Emails can be categorized as:

- **Work**
- **Personal**
- **Newsletter**
- **Action Required**

These categories directly correspond to the core categorization requirements in the project brief. :contentReference[oaicite:5]{index=5}

---

# 6. AI Thread Summarization

Long email conversations can contain many individual messages.

Instead of requiring the user to read every message, MailPilot processes the chronological thread context and generates a concise summary.

The inbox displays a short digest that helps users understand the conversation quickly.

Example:

```text
The project submission deadline has moved to Friday.
Final testing must be completed before Thursday evening.
```

The original requirement specifies concise two-line thread summaries in the inbox view. :contentReference[oaicite:6]{index=6}

---

# 7. Personalized Tone-Matched Draft Generation

One of MailPilot's main differentiators is personalized reply generation.

Instead of producing a generic response, the AI uses examples of previous user communication to understand writing characteristics such as:

- Formality
- Conciseness
- Greeting style
- Closing style
- Sentence structure
- Communication tone

The system then uses this context when generating a reply.

The SRS specifically requires the user's previous sent emails to be used as style references for tone-matched drafting. :contentReference[oaicite:7]{index=7}

---

# 8. Tone Customization

MailPilot provides a **5-level tone customization control**.

Users can adjust the generated response toward different communication styles, from more formal to more casual.

The selected tone influences the AI generation instructions while preserving the context of the original email.

This implements and extends the tone customization stretch requirement from the project brief. :contentReference[oaicite:8]{index=8}

---

# 9. Editable AI Drafts

Generated replies are not sent immediately.

The application presents the generated response as an editable draft.

The user can:

1. Read the generated response.
2. Modify the content.
3. Adjust the tone.
4. Review the final message.
5. Approve the response.

This directly satisfies the editable draft requirement. :contentReference[oaicite:9]{index=9}

---

# 10. Human-in-the-Loop Approval

MailPilot follows a human approval workflow:

```text
AI generates response
        ↓
User reviews response
        ↓
User edits if required
        ↓
User approves
        ↓
Message is sent
```

The system does not rely on autonomous AI sending without user confirmation.

This preserves user control over external communication.

The original SRS requires a clear Approve & Send workflow. :contentReference[oaicite:10]{index=10}

---

# 11. Real Gmail Integration

MailPilot extends the original demo requirement with real Gmail integration.

Authentication is performed using **Google OAuth 2.0**.

The Gmail integration supports:

- Gmail account connection
- Inbox synchronization
- Sent-message synchronization
- Gmail thread identification
- Read/unread state synchronization
- Mark-as-read operations
- Context-aware reply sending
- Gmail-side synchronization
- Application-side synchronization
- Gmail API quota handling

The original SRS listed Gmail integration as a stretch feature. :contentReference[oaicite:11]{index=11}

MailPilot implements this as an actual working integration rather than only a simulated interface.

---

# 12. Two-Way Gmail Synchronization

MailPilot maintains synchronization in both directions.

## Gmail → MailPilot

```text
Gmail
  ↓
Gmail API
  ↓
MailPilot Backend
  ↓
Application Data
  ↓
Inbox UI
```

Changes such as incoming messages and read state can be synchronized into MailPilot.

## MailPilot → Gmail

```text
MailPilot
  ↓
Backend
  ↓
Gmail API
  ↓
Gmail Account
```

Actions such as marking messages as read and sending approved replies are synchronized back to Gmail.

---

# 13. Gmail Synchronization Strategy

When a real Gmail account is connected:

- An initial synchronization is performed.
- Background synchronization runs every **2 minutes**.
- Concurrent synchronization attempts are prevented.
- Tab/window focus events are protected against excessive synchronization.
- Manual synchronization remains available.
- Synchronization stops when the user disconnects or logs out.

The implementation also includes Gmail API quota/rate-limit protection.

---

# 14. Gmail API Quota Protection

Real email APIs have request limits.

MailPilot therefore includes protection mechanisms such as:

- Synchronization mutex/lock
- Client-side in-flight protection
- Server-side synchronization lock
- Rate-limit detection
- Quota error detection
- Cooldown periods
- Exponential backoff
- Reduced unnecessary Gmail API requests

This was particularly important during development because Gmail API request quotas can be exceeded by excessive synchronization or repeated API calls.

The evaluator specifically recognized the application's Gmail synchronization and quota-management implementation as a project strength. :contentReference[oaicite:12]{index=12}

---

# 15. Demo Mode

MailPilot provides a separate Demo Mode for evaluation and presentation.

Demo Mode uses realistic sample email data and does not require a personal Gmail account.

## Demo Mode provides

- Preloaded inbox
- AI triage
- Priority classification
- Topic classification
- Thread summaries
- AI reply drafts
- Tone customization
- Editable drafts
- Approval workflow
- Analytics
- Bulk actions

## Demo Isolation

Demo Mode is isolated from real Gmail.

When Demo Mode is active:

```text
Gmail API calls       → Disabled
Real Gmail messages   → Hidden
Real Gmail sync       → Disabled
Real account identity → Hidden
Demo dataset          → Active
```

This allows the entire application to be demonstrated safely without connecting a real inbox.

---

# 16. Bulk Actions

MailPilot provides bulk inbox operations so users do not have to process every email individually.

Bulk actions are designed to reduce repetitive inbox-management work and improve productivity when handling multiple messages.

Bulk functionality is included as an extension of the original stretch requirement. :contentReference[oaicite:13]{index=13}

---

# 17. Analytics Dashboard

MailPilot includes an analytics dashboard for understanding inbox activity.

The analytics experience provides information about the processed email dataset and category distribution.

This extends the analytics stretch requirement specified in the project brief. :contentReference[oaicite:14]{index=14}

---

# 18. AI Reliability & Model Fallback

MailPilot includes a model fallback strategy in the AI service.

The application is designed so that if the primary configured model encounters an availability or processing failure, the backend can fall back to a secondary configured model.

This improves resilience compared with depending on a single model endpoint.

The evaluation report specifically identified the model fallback cascade as a strength. :contentReference[oaicite:15]{index=15}

---

# 19. Structured AI Processing

AI processing is used for:

```text
Email Content
     │
     ├──► Priority Classification
     │
     ├──► Topic Classification
     │
     ├──► Thread Summarization
     │
     └──► Reply Generation
```

The application also contains deterministic fallback/handling logic for situations where AI output is unavailable or cannot be processed as expected.

This addresses the structured-output consistency challenge identified in the original project brief. :contentReference[oaicite:16]{index=16}

---

# 20. System Architecture

MailPilot follows a three-tier architecture.

```text
┌─────────────────────────────────────────────┐
│                 FRONTEND                    │
│                                             │
│ React + TypeScript + Vite + Tailwind CSS   │
│                                             │
│ Inbox │ Drafts │ Sent │ Analytics │ Settings│
└──────────────────────┬──────────────────────┘
                       │
                       │ REST API
                       ▼
┌─────────────────────────────────────────────┐
│                  BACKEND                    │
│                                             │
│ Node.js + Express + TypeScript              │
│                                             │
│ Auth │ Email API │ AI │ Gmail │ Store       │
└──────────────┬───────────────┬──────────────┘
               │               │
               ▼               ▼
      ┌────────────────┐ ┌─────────────────┐
      │    Supabase    │ │    Groq AI      │
      │   PostgreSQL   │ │      LLM        │
      └────────────────┘ └─────────────────┘
               │
               │
               ▼
      ┌─────────────────┐
      │    Gmail API    │
      │    OAuth 2.0    │
      └─────────────────┘
```

---

# 21. Separation of Concerns

The backend is organized into separate responsibilities.

```text
server/src/
│
├── config/
│   └── supabase.ts
│
├── routes/
│   └── api.ts
│
├── services/
│   ├── ai.service.ts
│   ├── gmail.service.ts
│   ├── import.service.ts
│   └── store.service.ts
│
├── types/
│   └── index.ts
│
└── utils/
    ├── auth.ts
    └── csv.ts
```

### Main responsibilities

**AI Service**

Handles AI classification, summarization, and draft generation.

**Gmail Service**

Handles OAuth, synchronization, Gmail API operations, threading, read-state updates, and sending.

**Import Service**

Handles sample dataset ingestion.

**Store Service**

Handles application persistence and data access.

**Auth Utilities**

Handle authentication and password hashing.

**API Routes**

Expose the application's REST API to the frontend.

---

# 22. Data Model

The application works with core entities such as:

```text
User
  │
  ├── Email
  │      │
  │      └── Thread
  │
  ├── Draft
  │
  ├── Sent Email
  │
  └── User Style Profile
```

Important application concepts include:

- Users
- Emails
- Threads
- Thread messages
- Drafts
- Sent emails
- User style profiles
- Style examples

This follows the data-model direction proposed in the original SRS. :contentReference[oaicite:17]{index=17}

---

# 23. Persistence

MailPilot uses **Supabase PostgreSQL** for structured application data.

The application also contains a local persistence/fallback strategy for development and resilience.

This dual-layer persistence architecture was specifically recognized in the project evaluation. :contentReference[oaicite:18]{index=18}

---

# 24. Authentication & Security

MailPilot includes application authentication with:

- User registration
- User login
- Password hashing
- Authenticated application routes
- Demo user isolation
- Environment-based secret configuration

Passwords are protected using **PBKDF2 with SHA-512** rather than being stored as plaintext.

Sensitive configuration is kept outside the source repository.

The evaluator specifically recognized PBKDF2 password hashing and secure environment-variable handling. :contentReference[oaicite:19]{index=19}

---

# 25. Secret Management

Sensitive values are not committed to GitHub.

The repository excludes files such as:

```text
.env
.env.*
.gmail_tokens.json
node_modules/
dist/
build/
```

Developers should create their own local environment configuration using:

```text
server/.env.example
```

Never commit:

- API keys
- OAuth client secrets
- Gmail tokens
- Database service-role keys
- Other private credentials

---

# 26. Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS

## Backend

- Node.js
- Express
- TypeScript
- ESM

## Database

- Supabase
- PostgreSQL

## AI

- Groq API
- Llama 3.3 70B Versatile
- Configurable secondary model fallback

## Email

- Gmail API
- Google OAuth 2.0

## Development

- npm
- Git
- GitHub

---

# 27. Why These Technologies?

### React + TypeScript

Used to build a responsive inbox-style dashboard while maintaining strong type safety across the frontend.

### Node.js + Express

Provides a lightweight REST backend for authentication, email processing, AI orchestration, persistence, and Gmail integration.

### Supabase + PostgreSQL

Provides structured relational storage suitable for users, threads, messages, drafts, style profiles, and email metadata.

### Groq

Provides low-latency LLM inference for interactive classification, summarization, and drafting workflows.

### Gmail API

Provides real email synchronization and approved email actions through OAuth.

---

# 28. Project Structure

```text
EMAIL.exe/
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── assets/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── api.ts
│   │   ├── index.css
│   │   ├── main.tsx
│   │   └── types.ts
│   │
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/
│   ├── data/
│   ├── scripts/
│   ├── src/
│   │   ├── config/
│   │   ├── data/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   │
│   ├── tests/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── package.json
├── README.md
└── .gitignore
```

---

# 29. Installation

## Prerequisites

Install:

- Node.js
- npm
- Git
- Supabase account/project
- Groq API access

For real Gmail integration:

- Google Cloud project
- Gmail API enabled
- OAuth credentials

---

## Clone the Repository

```bash
git clone https://github.com/kollasumanth2357/EMAIL.exe.git
cd EMAIL.exe
```

---

## Install Dependencies

```bash
npm install
```

```bash
npm --prefix client install
```

```bash
npm --prefix server install
```

---

# 30. Environment Configuration

Create:

```text
server/.env
```

Use:

```text
server/.env.example
```

as the configuration reference.

Example:

```env
PORT=5000

GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile

SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:5000/api/gmail/oauth/callback
```

Do not use the example values as real credentials.

---

# 31. Run the Backend

From the project root:

```bash
npm --prefix server run dev
```

Backend:

```text
http://localhost:5000
```

---

# 32. Run the Frontend

Open another terminal:

```bash
npm --prefix client run dev
```

Open the Vite URL shown in the terminal.

---

# 33. Gmail OAuth Configuration

For real Gmail integration:

1. Create a Google Cloud project.
2. Enable Gmail API.
3. Configure OAuth consent.
4. Create OAuth client credentials.
5. Configure the local redirect URI:

```text
http://localhost:5000/api/gmail/oauth/callback
```

6. Add the credentials to `server/.env`.
7. Start the backend.
8. Start the frontend.
9. Connect Gmail from MailPilot.

Gmail credentials and tokens must remain local and must never be committed to GitHub.

---

# 34. Demo Workflow

The recommended evaluation workflow is:

```text
Login
  ↓
Launch Demo Mode
  ↓
View populated inbox
  ↓
Observe Priority + Topic labels
  ↓
Open a multi-message thread
  ↓
Read AI-generated summary
  ↓
Generate contextual reply
  ↓
Adjust tone
  ↓
Edit draft
  ↓
Approve
  ↓
View Drafts / Sent
  ↓
Open Analytics
```

This demonstrates the complete core product workflow without requiring a real Gmail account.

---

# 35. Real Gmail Workflow

For the real integration demonstration:

```text
Connect Gmail
      ↓
OAuth Authentication
      ↓
Initial Synchronization
      ↓
Inbox Appears in MailPilot
      ↓
AI Triage
      ↓
Open Email
      ↓
Generate Reply
      ↓
Edit Reply
      ↓
Approve & Send
      ↓
Gmail Receives Reply
      ↓
Synchronization Updates MailPilot
```

---

# 36. Testing & Verification

The project contains automated verification scripts covering multiple development phases.

Testing areas include:

- Database connectivity
- Database persistence
- Import functionality
- AI classification
- AI summaries
- Draft generation
- Draft persistence
- Send workflow
- Gmail OAuth
- HTTP endpoints
- Application restart persistence
- End-to-end verification

The repository contains test and verification scripts under:

```text
server/scripts/
server/tests/
```

---

# 37. Build Verification

## Backend

```bash
npm --prefix server run build
```

## Frontend

```bash
npm --prefix client run build
```

Both builds are used to verify that the frontend and backend compile successfully.

---

# 38. Reliability

MailPilot includes several reliability mechanisms:

### AI fallback

A secondary model configuration is available if the primary model encounters an issue.

### Gmail synchronization lock

Prevents multiple Gmail synchronization operations from executing concurrently.

### Quota cooldown

Detects Gmail quota/rate-limit responses and prevents aggressive repeated requests.

### Exponential backoff

Provides progressively longer cooldown periods when rate limits persist.

### Demo isolation

Prevents accidental Gmail API access while using Demo Mode.

### Persistence

Application data can be persisted through the database and local fallback strategy.

---

# 39. Challenges Addressed

## Challenge 1 — Personalized AI Replies

Generic AI replies often sound repetitive.

MailPilot addresses this by using previous communication examples as style references and allowing explicit tone adjustment.

---

## Challenge 2 — Consistent AI Output

LLMs can sometimes return inconsistent output.

MailPilot combines structured AI processing with fallback handling to keep the application's workflow usable.

---

## Challenge 3 — Multi-message Threads

A thread contains multiple messages that need to be interpreted chronologically.

MailPilot preserves thread relationships and processes the conversation context before generating summaries and replies.

---

## Challenge 4 — Gmail API Limits

Real Gmail integration introduces API quotas and rate limits.

MailPilot addresses this with:

- Reduced unnecessary requests
- Synchronization locks
- Cooldown handling
- Exponential backoff
- Two-minute synchronization cadence

---

## Challenge 5 — Safe Demonstration

Sending real emails during a demonstration can be risky.

MailPilot therefore provides a fully isolated Demo Mode while still supporting real Gmail integration when explicitly connected.

---

# 40. Evaluation Alignment

MailPilot maps directly to the hackathon requirements.

| Requirement | Implementation |
|---|---|
| Inbox import | CSV/JSON import + Demo dataset + Gmail |
| AI categorization | Priority + Topic classification |
| Thread summarization | Concise thread digest |
| Tone-matched drafting | User style profile + contextual AI |
| Editable drafts | Editable draft interface |
| Approve & Send | Human approval workflow |
| Inbox dashboard | Priority/topic/summary inbox |
| Real inbox connection | Gmail OAuth |
| Tone slider | 5-level tone customization |
| Bulk actions | Bulk inbox operations |
| Analytics | Analytics dashboard |

The first seven items correspond to the core requirements, while Gmail, tone customization, bulk actions, and analytics correspond to the stretch requirements in the original brief. :contentReference[oaicite:20]{index=20}

---

# 41. Engineering Highlights

The project goes beyond a basic AI email prototype through:

- Real Gmail OAuth integration
- Two-way Gmail synchronization
- Gmail read-state synchronization
- Gmail thread-aware reply handling
- Gmail API quota management
- Concurrent synchronization protection
- AI model fallback
- Personalized writing style
- 5-level tone control
- Human-in-the-loop approval
- Demo/real Gmail isolation
- PBKDF2 password hashing
- Supabase PostgreSQL persistence
- Local persistence/fallback strategy
- Automated verification scripts
- Modular TypeScript architecture

---

# 42. Security Considerations

MailPilot is designed with the following security practices:

- Passwords are hashed rather than stored as plaintext.
- API keys are stored through environment variables.
- OAuth credentials are kept outside source control.
- Gmail tokens are excluded from Git.
- Demo Mode is isolated from real Gmail.
- Authenticated routes protect user-specific operations.
- User approval is required before sending generated responses.

For production deployment, additional measures such as authentication rate limiting, stronger import validation, and centralized structured logging should be added.

---

# 43. Current Limitations

The current development version has some areas that can be improved for production deployment:

- Import validation can be made more granular for malformed CSV/JSON data.
- Production observability can be improved with structured logging.
- Authentication endpoints can use dedicated rate limiting.
- Long-running batch processing can be moved to a background job queue.
- CI/CD automation can be added.

These are engineering improvements rather than blockers to the core application workflow.

---

# 44. Future Enhancements

Potential future improvements include:

### Background Processing

Introduce a job queue such as BullMQ for large-scale email triage and AI processing.

### Structured Logging

Introduce a production logging framework such as Winston or an equivalent structured logging solution.

### Authentication Protection

Add authentication-specific rate limiting and additional account security controls.

### Advanced Import Validation

Improve CSV/JSON validation and provide clearer feedback for malformed records.

### CI/CD

Add automated:

- Build verification
- Testing
- Security checks
- Deployment

### Additional Email Providers

Extend the architecture to support additional email providers beyond Gmail.

### Advanced AI Personalization

Improve style learning using larger and more diverse user communication samples.

### Productivity Intelligence

Add deeper analytics such as:

- Response-time analysis
- Inbox workload trends
- Action-required trends
- Personalized productivity insights

---

# 45. Why MailPilot?

MailPilot is not designed to replace the user.

It is designed to remove repetitive work from the email workflow.

```text
Traditional Workflow

Read email
   ↓
Understand context
   ↓
Decide priority
   ↓
Read entire thread
   ↓
Think about response
   ↓
Write response
   ↓
Review response
   ↓
Send


MailPilot Workflow

Open inbox
   ↓
AI triage
   ↓
AI summary
   ↓
AI contextual draft
   ↓
Review
   ↓
Approve
   ↓
Send
```

The human remains responsible for the final communication while AI handles the repetitive analysis and drafting work.

---

# 46. Demo Story

The intended demonstration follows a simple productivity story:

### Before

A user starts the morning with a large inbox and needs to manually determine:

- What is urgent?
- What requires action?
- What can wait?
- What happened in a long thread?
- How should each person be answered?

### With MailPilot

The user opens MailPilot and immediately sees:

- Priority
- Topic
- Thread summary
- AI-generated response options

The user reviews and approves the responses instead of writing every message from scratch.

This follows the intended demo narrative from the original problem brief: transforming inbox overload into a much faster morning workflow. :contentReference[oaicite:21]{index=21}

---

# 47. Repository

GitHub:

https://github.com/kollasumanth2357/EMAIL.exe

---

# 48. Project Summary

**MailPilot — AI Email Inbox Triage & Draft Assistant** is a full-stack AI productivity application that combines:

```text
Intelligent Inbox Triage
        +
Thread Summarization
        +
Personalized AI Drafting
        +
Tone Customization
        +
Editable Responses
        +
Human Approval
        +
Real Gmail Synchronization
        +
Analytics
```

The project demonstrates how AI can be integrated into a real-world productivity workflow while maintaining user control, application reliability, API resilience, and secure handling of credentials.

---

## MailPilot

### Understand your inbox. Draft smarter. Stay in control.
