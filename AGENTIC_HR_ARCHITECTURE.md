# Agentic HR - System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                             │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐     │
│  │   Dashboard  │  │  Create Job  │  │  Candidate List      │     │
│  │              │  │              │  │  - Top 25 View       │     │
│  │  Job Cards   │  │  JD Form     │  │  - All Candidates    │     │
│  │  Status      │  │  Submit      │  │  - Analytics         │     │
│  └──────────────┘  └──────────────┘  └──────────────────────┘     │
│                                                                      │
└───────────────────────────┬──────────────────────────────────────────┘
                            │ HTTPS/REST
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API Gateway (REST API)                          │
│                                                                      │
│  POST /agenticHR/submitJob        → λ agenticHR_submitJob          │
│  POST /agenticHR/listJobs         → λ agenticHR_listJobs           │
│  POST /agenticHR/getJobDetails    → λ agenticHR_getJobDetails      │
│                                                                      │
└───────────┬─────────────────────────┬────────────────┬─────────────┘
            │                         │                │
            ▼                         ▼                ▼
┌─────────────────┐     ┌──────────────────┐   ┌─────────────────┐
│  λ submitJob    │     │  λ listJobs      │   │λ getJobDetails  │
│                 │     │                  │   │                 │
│ • Create job    │     │ • Query by email │   │ • Get candidates│
│ • Send SQS msg  │     │ • Return list    │   │ • Rank top 25   │
│                 │     │                  │   │ • Return data   │
└────────┬────────┘     └──────────────────┘   └─────────────────┘
         │
         │ Send Message
         ▼
┌──────────────────────────────────────────────────────────────────────┐
│                       SQS Queue (AgenticHR-Queue)                    │
│                                                                       │
│  Message Flow:                                                        │
│  1. start_collection → collectProfiles                               │
│  2. start_profiling → profileCandidates                             │
│  3. generate_tests → generateTests                                   │
│  4. send_invites → sendInvites                                       │
│  5. send_followups → sendFollowups (48h delay)                      │
│                                                                       │
└────┬────────┬─────────┬──────────┬───────────┬──────────────────────┘
     │        │         │          │           │
     ▼        ▼         ▼          ▼           ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────────┐
│λ collect │ │λprofile│ │λgen    │ │λsend   │ │λ followup  │
│Profiles  │ │Candids │ │Tests   │ │Invites │ │            │
└────┬─────┘ └───┬────┘ └───┬────┘ └───┬────┘ └──────┬─────┘
     │           │           │          │             │
     └───────────┴───────────┴──────────┴─────────────┘
                            │
                ┌───────────┴────────────┐
                │                        │
                ▼                        ▼
     ┌──────────────────┐    ┌──────────────────┐
     │   DynamoDB       │    │  AWS Services    │
     │                  │    │                  │
     │ • Jobs Table     │    │ • Bedrock (AI)   │
     │ • Candidates     │    │ • SES (Email)    │
     │ • Tests Table    │    │                  │
     └──────────────────┘    └──────────────────┘
```

## Detailed Data Flow

### 1. Job Submission Flow
```
User Action: Submit Job
    ↓
Frontend: POST /agenticHR/submitJob
    ↓
API Gateway: Route to Lambda
    ↓
λ submitJob:
    • Generate jobId (UUID)
    • Store in AgenticHR_Jobs table
    • Send SQS message {action: 'start_collection'}
    • Return jobId to frontend
    ↓
Frontend: Display "Collecting" status
```

### 2. Profile Collection Flow
```
SQS Message: {action: 'start_collection'}
    ↓
λ collectProfiles (triggered by SQS):
    • Update job status → 'collecting'
    • Call search_linkedin(jobTitle, jobDescription)
        ↳ Mock: Returns 10 profiles
    • Call search_naukri(jobTitle, jobDescription)
        ↳ Mock: Returns 8 profiles
    • Call search_monster(jobTitle, jobDescription)
        ↳ Mock: Returns 7 profiles
    • Store each candidate in AgenticHR_Candidates
    • Update job.candidatesCount = 25
    • Update job status → 'profiling'
    • Send SQS message {action: 'start_profiling'}
```

### 3. Candidate Profiling Flow
```
SQS Message: {action: 'start_profiling'}
    ↓
λ profileCandidates (triggered by SQS):
    • Query all candidates for jobId
    • For each candidate:
        ↓
        profile_candidate_with_ai(jobDescription, resume)
            ↓
            AWS Bedrock (Amazon Nova Lite):
            • Analyze resume vs JD
            • Generate matchScore (0-100)
            • Identify strengths []
            • Identify gaps []
            ↓
        Store results in candidate record
    • Update job status → 'testing'
    • Send SQS message {action: 'generate_tests'}
```

### 4. Test Generation Flow
```
SQS Message: {action: 'generate_tests'}
    ↓
λ generateTests (triggered by SQS):
    • generate_test_with_ai(jobDescription)
        ↓
        AWS Bedrock (Amazon Nova Lite):
        • Generate 10 MCQ questions
        • Each with 4 options
        • Identify correct answer
        ↓
    • Generate testId (UUID)
    • Store in AgenticHR_Tests table
    • Update job.testId = testId
    • Update job status → 'inviting'
    • Send SQS message {action: 'send_invites', testId: testId}
```

### 5. Invitation Flow
```
SQS Message: {action: 'send_invites', testId: testId}
    ↓
λ sendInvites (triggered by SQS):
    • Get job details
    • Query profiled candidates
    • For each candidate:
        ↓
        • Generate unique test link:
          https://hrrobots.click/test?testId=XXX&candidateId=YYY
        ↓
        send_test_invite(email, name, jobTitle, testLink)
            ↓
            AWS SES:
            • Send HTML email
            • Professional template
            • Call-to-action button
            ↓
        • Update candidate.testStatus = 'invited'
        • Store candidate.testLink
        • Store candidate.invitedAt timestamp
    • Update job.invitedCount
    • Update job status → 'following_up'
    • Send delayed SQS message (48 hours)
      {action: 'send_followups', testId: testId}
```

### 6. Follow-up Flow
```
SQS Message (after 48h delay): {action: 'send_followups'}
    ↓
λ sendFollowups (triggered by SQS):
    • Query candidates with testStatus = 'invited'
    • For each candidate not completed:
        ↓
        send_followup_email(email, name, jobTitle, testLink)
            ↓
            AWS SES:
            • Send reminder email
            • Urgent tone
            • CTA button
            ↓
        • Update candidate.testStatus = 'reminded'
        • Store candidate.remindedAt timestamp
    • Update job.remindedCount
    • Update job status → 'completed'
```

### 7. View Results Flow
```
User Action: Click job card
    ↓
Frontend: POST /agenticHR/getJobDetails
    ↓
λ getJobDetails:
    • Verify job belongs to user (email match)
    • Query all candidates for jobId
    • Sort by: testScore DESC, matchScore DESC
    • Get top 25 candidates
    • Return {job, candidates[], topCandidates[]}
    ↓
Frontend:
    • Display top 25 in table
    • Show all candidates in grid
    • Render statistics
```

## Database Relationships

```
┌─────────────────────────────────────────┐
│          AgenticHR_Jobs                 │
│─────────────────────────────────────────│
│ PK: jobId                               │
│─────────────────────────────────────────│
│ email                                   │
│ jobTitle                                │
│ jobDescription                          │
│ status                                  │
│ candidatesCount                         │
│ testId ────────────┐                    │
│ ...                │                    │
└────────────────────┼────────────────────┘
                     │
                     │ 1:1
                     │
        ┌────────────┼────────────────────────┐
        │            │                        │
        │            ▼                        │
        │  ┌──────────────────────┐          │
        │  │  AgenticHR_Tests     │          │
        │  │──────────────────────│          │
        │  │ PK: testId           │          │
        │  │──────────────────────│          │
        │  │ jobId (FK)           │          │
        │  │ questions[]          │          │
        │  └──────────────────────┘          │
        │                                    │
        │ 1:N                                │
        │                                    │
        ▼                                    │
┌─────────────────────────────────────────┐ │
│      AgenticHR_Candidates               │ │
│─────────────────────────────────────────│ │
│ PK: candidateId                         │ │
│─────────────────────────────────────────│ │
│ jobId (FK) ─────────────────────────────┘
│ name                                    │
│ candidateEmail                          │
│ resume                                  │
│ matchScore                              │
│ testScore                               │
│ testStatus                              │
│ source                                  │
│ ...                                     │
└─────────────────────────────────────────┘

GSI Indexes:
• Jobs: email-index (for listing user's jobs)
• Candidates: jobId-index (for querying job's candidates)
• Tests: jobId-index (for finding job's test)
```

## State Machine Diagram

```
                    [Job Submitted]
                          │
                          ▼
                  ┌───────────────┐
                  │  COLLECTING   │ ← Scraping job portals
                  └───────┬───────┘
                          │ ~25 profiles collected
                          ▼
                  ┌───────────────┐
                  │   PROFILING   │ ← AI analyzing resumes
                  └───────┬───────┘
                          │ Match scores calculated
                          ▼
                  ┌───────────────┐
                  │    TESTING    │ ← AI generating questions
                  └───────┬───────┘
                          │ Test created
                          ▼
                  ┌───────────────┐
                  │   INVITING    │ ← Sending emails
                  └───────┬───────┘
                          │ Invites sent
                          ▼
                  ┌───────────────┐
                  │ FOLLOWING_UP  │ ← Waiting 48h, sending reminders
                  └───────┬───────┘
                          │ Reminders sent
                          ▼
                  ┌───────────────┐
                  │   COMPLETED   │ ← Ready for review
                  └───────────────┘
```

## AWS Services Integration

```
┌──────────────────────────────────────────────────────────────┐
│                     AWS Cloud                                 │
│                                                               │
│  ┌────────────┐         ┌────────────┐                      │
│  │ CloudFront │ ──────→ │     S3     │                      │
│  │    CDN     │         │  (Static)  │                      │
│  └────────────┘         └────────────┘                      │
│        │                                                      │
│        │ HTTPS                                               │
│        ▼                                                      │
│  ┌─────────────────────────────────────────────┐            │
│  │           API Gateway (REST)                 │            │
│  │  • CORS enabled                              │            │
│  │  • JWT validation (optional)                 │            │
│  │  • Throttling                                │            │
│  └───┬─────────────────────────┬────────────────┘            │
│      │                         │                             │
│      ▼                         ▼                             │
│  ┌────────────┐          ┌────────────┐                     │
│  │  Lambda    │          │  Lambda    │  (8 functions)      │
│  │ Functions  │◄────────►│ Functions  │                     │
│  └─────┬──────┘          └──────┬─────┘                     │
│        │                        │                            │
│        ├────────────────────────┼──────────────┐            │
│        │                        │              │            │
│        ▼                        ▼              ▼            │
│  ┌───────────┐           ┌──────────┐   ┌──────────┐       │
│  │ DynamoDB  │           │   SQS    │   │ Bedrock  │       │
│  │           │           │  Queue   │   │   (AI)   │       │
│  │ • Jobs    │           │          │   │          │       │
│  │ • Candids │           │ Messages │   │ • Nova   │       │
│  │ • Tests   │           │ (async)  │   │ • Gen    │       │
│  └───────────┘           └──────────┘   └──────────┘       │
│        │                                      │              │
│        │                                      │              │
│        ▼                                      ▼              │
│  ┌──────────────────┐              ┌──────────────────┐    │
│  │   CloudWatch     │              │      SES         │    │
│  │   Logs/Metrics   │              │   (Email)        │    │
│  └──────────────────┘              └──────────────────┘    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Security Layers                   │
└─────────────────────────────────────────────────────┘

Layer 1: Network
├─ CloudFront: HTTPS only, WAF rules
├─ API Gateway: Regional endpoint, custom domain
└─ VPC: Lambda in VPC (optional)

Layer 2: Authentication & Authorization
├─ JWT Token: Validated in Lambda
├─ Email Scoping: Users see only their jobs
└─ IAM Roles: Least privilege for Lambda

Layer 3: Data Protection
├─ DynamoDB: Encryption at rest (KMS)
├─ S3: Bucket encryption, versioning
└─ SES: DKIM, SPF, DMARC

Layer 4: Application
├─ Input Validation: Sanitize user input
├─ SQL Injection: N/A (NoSQL)
├─ XSS: React auto-escaping
└─ CSRF: Token-based

Layer 5: Monitoring
├─ CloudWatch: Logs, metrics, alarms
├─ X-Ray: Request tracing (optional)
└─ GuardDuty: Threat detection
```

## Performance Optimization

```
Frontend:
├─ React.lazy(): Code splitting
├─ Memoization: useCallback, useMemo
├─ Debouncing: API calls
└─ CDN: CloudFront caching

Backend:
├─ Lambda: Right-sized memory (512MB-1024MB)
├─ DynamoDB: On-demand or provisioned capacity
├─ SQS: Batch processing
└─ Bedrock: Streaming responses

Caching:
├─ API Gateway: Cache GET requests
├─ DynamoDB: DAX (optional)
└─ CloudFront: Static assets (1 day)
```

---

This architecture supports:
- ✅ High availability (multi-AZ)
- ✅ Auto-scaling (serverless)
- ✅ Fault tolerance (retries, DLQ)
- ✅ Cost optimization (pay-per-use)
- ✅ Security best practices
- ✅ Async processing (SQS)
- ✅ AI integration (Bedrock)
- ✅ Email automation (SES)
