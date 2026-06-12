# Agentic HR - Testing Checklist

## Pre-Deployment Checks

### ✅ AWS Resources
- [ ] DynamoDB Tables created
  - [ ] AgenticHR_Jobs with email-index GSI
  - [ ] AgenticHR_Candidates with jobId-index GSI
  - [ ] AgenticHR_Tests with jobId-index GSI
- [ ] SQS Queue created (AgenticHR-Queue)
- [ ] SES Email verified (check inbox for link)
- [ ] Lambda IAM role has proper permissions:
  - [ ] DynamoDB read/write
  - [ ] SQS send/receive
  - [ ] SES send email
  - [ ] Bedrock invoke model
  - [ ] CloudWatch logs

### ✅ Lambda Functions
- [ ] All 8 functions deployed:
  - [ ] agenticHR_submitJob
  - [ ] agenticHR_listJobs
  - [ ] agenticHR_collectProfiles
  - [ ] agenticHR_profileCandidates
  - [ ] agenticHR_generateTests
  - [ ] agenticHR_sendInvites
  - [ ] agenticHR_sendFollowups
  - [ ] agenticHR_getJobDetails
- [ ] Environment variables set (QUEUE_URL)
- [ ] Timeout set to 300 seconds
- [ ] Memory set to 512MB-1024MB

### ✅ SQS Triggers
- [ ] collectProfiles has SQS trigger
- [ ] profileCandidates has SQS trigger
- [ ] generateTests has SQS trigger
- [ ] sendInvites has SQS trigger
- [ ] sendFollowups has SQS trigger

### ✅ API Gateway
- [ ] REST API created or updated
- [ ] /agenticHR resource created
- [ ] POST /agenticHR/submitJob configured
- [ ] POST /agenticHR/listJobs configured
- [ ] POST /agenticHR/getJobDetails configured
- [ ] CORS enabled for all endpoints
- [ ] API deployed to stage (e.g., 'dev')
- [ ] API URL noted for frontend

### ✅ Frontend
- [ ] agenticHR.js API URLs updated
- [ ] agenticHR.css file present
- [ ] Card added to createTest.js
- [ ] Route added to App.js
- [ ] Build successful (`npm run build`)
- [ ] Deployed to S3/CloudFront

---

## Unit Testing

### Test 1: Submit Job Lambda
```bash
aws lambda invoke \
  --function-name agenticHR_submitJob \
  --payload '{"body":"{\"email\":\"test@example.com\",\"jobTitle\":\"Software Engineer\",\"jobDescription\":\"Looking for a skilled developer\",\"token\":\"test-token\"}"}' \
  response.json

cat response.json
```

**Expected:**
```json
{
  "statusCode": 200,
  "body": "{\"message\":\"Job submitted successfully\",\"jobId\":\"UUID\"}"
}
```

**Verify:**
- [ ] Job created in DynamoDB
- [ ] SQS message sent

### Test 2: List Jobs Lambda
```bash
aws lambda invoke \
  --function-name agenticHR_listJobs \
  --payload '{"body":"{\"email\":\"test@example.com\",\"token\":\"test-token\"}"}' \
  response.json

cat response.json
```

**Expected:**
```json
{
  "statusCode": 200,
  "body": "{\"jobs\":[...]}"
}
```

**Verify:**
- [ ] Returns jobs for user
- [ ] Empty array if no jobs

### Test 3: Check DynamoDB Tables
```bash
# Check Jobs table
aws dynamodb scan --table-name AgenticHR_Jobs --limit 5

# Check Candidates table  
aws dynamodb scan --table-name AgenticHR_Candidates --limit 5

# Check Tests table
aws dynamodb scan --table-name AgenticHR_Tests --limit 5
```

**Verify:**
- [ ] Tables accessible
- [ ] Data structure correct

### Test 4: Check SQS Queue
```bash
# Get queue URL
aws sqs get-queue-url --queue-name AgenticHR-Queue

# Check for messages
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue
```

**Verify:**
- [ ] Queue exists
- [ ] Messages flowing

### Test 5: Check CloudWatch Logs
```bash
# Check logs for a Lambda
aws logs tail /aws/lambda/agenticHR_submitJob --follow
```

**Verify:**
- [ ] Logs being written
- [ ] No error messages
- [ ] Correct execution flow

---

## Integration Testing

### Test 6: End-to-End Workflow

#### Step 1: Submit Job via API
```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/agenticHR/submitJob \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "jobTitle": "Senior Full Stack Developer",
    "jobDescription": "We are looking for an experienced full stack developer with React and Node.js expertise...",
    "token": "your-jwt-token"
  }'
```

**Expected Response:**
```json
{
  "message": "Job submitted successfully",
  "jobId": "abc-123-xyz"
}
```

**Verify:**
- [ ] HTTP 200 status
- [ ] jobId returned
- [ ] Job appears in DynamoDB

#### Step 2: Monitor CloudWatch Logs
```bash
# Watch submitJob logs
aws logs tail /aws/lambda/agenticHR_submitJob --follow

# Watch collectProfiles logs (should start automatically)
aws logs tail /aws/lambda/agenticHR_collectProfiles --follow
```

**Verify:**
- [ ] submitJob executed
- [ ] SQS message sent
- [ ] collectProfiles triggered
- [ ] Profiles collected (~25 candidates)

#### Step 3: Check Job Status
```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/agenticHR/listJobs \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "token": "your-jwt-token"
  }'
```

**Expected:**
```json
{
  "jobs": [
    {
      "jobId": "abc-123-xyz",
      "jobTitle": "Senior Full Stack Developer",
      "status": "profiling",
      "candidatesCount": 25,
      ...
    }
  ]
}
```

**Verify:**
- [ ] Job status progressing
- [ ] candidatesCount updated

#### Step 4: Wait for Profiling (2-5 minutes)
```bash
# Monitor profiling Lambda
aws logs tail /aws/lambda/agenticHR_profileCandidates --follow
```

**Verify:**
- [ ] Bedrock API called
- [ ] Match scores calculated
- [ ] No errors in logs

#### Step 5: Check Test Generation
```bash
# Monitor test generation Lambda
aws logs tail /aws/lambda/agenticHR_generateTests --follow

# Check if test created
aws dynamodb query \
  --table-name AgenticHR_Tests \
  --index-name jobId-index \
  --key-condition-expression "jobId = :jobId" \
  --expression-attribute-values '{":jobId":{"S":"abc-123-xyz"}}'
```

**Verify:**
- [ ] Test questions generated
- [ ] Test stored in DynamoDB
- [ ] 10 questions with 4 options each

#### Step 6: Verify Email Invitations
**Check:**
- [ ] SES dashboard shows sent emails
- [ ] Email received in inbox (if sandbox, recipient must be verified)
- [ ] Email formatting correct
- [ ] Test link valid

#### Step 7: Get Job Details
```bash
curl -X POST https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/agenticHR/getJobDetails \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "jobId": "abc-123-xyz",
    "token": "your-jwt-token"
  }'
```

**Expected:**
```json
{
  "job": {...},
  "candidates": [...],
  "topCandidates": [25 candidates sorted by score]
}
```

**Verify:**
- [ ] All candidates returned
- [ ] Top 25 properly ranked
- [ ] Match scores present
- [ ] Test statuses correct

---

## Frontend Testing

### Test 8: UI Navigation
- [ ] Login to HR Robots
- [ ] See "Agentic HR" card on dashboard
- [ ] Click card → navigates to /agenticHR
- [ ] See empty state if no jobs

### Test 9: Job Submission Flow
- [ ] Click "New Job" button
- [ ] Form appears with fields:
  - [ ] Job Title (required)
  - [ ] Job Description (required textarea)
- [ ] Enter valid data
- [ ] Click "Start Agentic Process"
- [ ] See loading indicator
- [ ] Toast notification appears
- [ ] Redirected to main view
- [ ] New job card appears

### Test 10: Job Card Display
- [ ] Job card shows:
  - [ ] Job title
  - [ ] Status badge (correct color)
  - [ ] Truncated description
  - [ ] Candidate count
  - [ ] Test count
  - [ ] Progress bar (correct percentage)
  - [ ] Created date
- [ ] Hover shows elevation effect
- [ ] Click navigates to candidate view

### Test 11: Candidate List View
- [ ] Back button works
- [ ] Job title displayed
- [ ] Status badge shown
- [ ] Top 25 section appears (if completed)
- [ ] Table shows:
  - [ ] Rank #
  - [ ] Candidate name & email
  - [ ] Match score with bar
  - [ ] Test status badge
  - [ ] Test score (if completed)
  - [ ] Source badge
  - [ ] View button
- [ ] All candidates grid displays
- [ ] Empty state if no candidates yet

### Test 12: Responsive Design
- [ ] Desktop (1920px): All elements visible
- [ ] Tablet (768px): Grid adjusts
- [ ] Mobile (375px): Single column layout
- [ ] Touch interactions work

### Test 13: Error Handling
- [ ] Network error → toast notification
- [ ] Invalid JWT → redirect to login
- [ ] Empty form → validation message
- [ ] API error → error toast

---

## Performance Testing

### Test 14: Load Testing
```bash
# Use Apache Bench or similar
ab -n 100 -c 10 -p job.json -T application/json \
  https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev/agenticHR/submitJob
```

**Verify:**
- [ ] API responds within 3 seconds
- [ ] No errors under load
- [ ] Lambda scales appropriately

### Test 15: Database Performance
- [ ] Query jobs by email < 100ms
- [ ] Query candidates by jobId < 200ms
- [ ] Scan operations avoided
- [ ] GSI used for queries

### Test 16: AI Performance
- [ ] Bedrock profiling < 5 seconds per candidate
- [ ] Test generation < 10 seconds
- [ ] Streaming responses handled correctly

---

## Security Testing

### Test 17: Authentication
- [ ] API rejects requests without token
- [ ] Expired tokens rejected
- [ ] Invalid tokens rejected

### Test 18: Authorization
- [ ] Users can't access other users' jobs
- [ ] Email scoping enforced
- [ ] CORS headers present

### Test 19: Input Validation
- [ ] SQL injection attempts blocked (N/A for NoSQL)
- [ ] XSS attempts sanitized
- [ ] Oversized payloads rejected
- [ ] Special characters handled

### Test 20: Data Privacy
- [ ] Candidate data encrypted at rest
- [ ] Emails sent via verified domain
- [ ] No sensitive data in logs
- [ ] PII properly handled

---

## Monitoring & Alerting

### Test 21: CloudWatch Metrics
- [ ] Lambda invocations tracked
- [ ] Error rates visible
- [ ] Duration metrics available
- [ ] Custom metrics (optional)

### Test 22: CloudWatch Alarms (Optional)
- [ ] Alarm for Lambda errors > 5%
- [ ] Alarm for DynamoDB throttling
- [ ] Alarm for SQS dead letter queue
- [ ] SNS notifications configured

### Test 23: Cost Monitoring
- [ ] Cost Explorer shows breakdown
- [ ] Lambda costs reasonable
- [ ] DynamoDB costs tracked
- [ ] Bedrock usage monitored

---

## Production Readiness

### Test 24: Documentation
- [ ] README complete
- [ ] Architecture diagrams clear
- [ ] Deployment guide accurate
- [ ] API documentation available

### Test 25: Backup & Recovery
- [ ] DynamoDB backups enabled (optional)
- [ ] Point-in-time recovery configured (optional)
- [ ] Lambda code in version control
- [ ] Infrastructure as Code (optional)

### Test 26: Disaster Recovery
- [ ] Dead letter queue configured
- [ ] Retry policies set
- [ ] Timeout values appropriate
- [ ] Graceful degradation tested

---

## Sign-off Checklist

### Functional Requirements
- [ ] ✅ Profile collection from multiple sources
- [ ] ✅ AI-powered candidate profiling
- [ ] ✅ Automated test generation
- [ ] ✅ Email invitation system
- [ ] ✅ Follow-up automation
- [ ] ✅ Top 25 candidate ranking
- [ ] ✅ Real-time status tracking

### Non-Functional Requirements
- [ ] ✅ Performance: < 3s API response
- [ ] ✅ Scalability: Handles 100+ concurrent jobs
- [ ] ✅ Availability: 99.9% uptime (Lambda SLA)
- [ ] ✅ Security: Authentication & authorization
- [ ] ✅ Maintainability: Well-documented code
- [ ] ✅ Cost: < $100/month for 100 jobs

### Deployment
- [ ] ✅ Development environment tested
- [ ] ✅ Staging environment tested (optional)
- [ ] ✅ Production deployment plan ready
- [ ] ✅ Rollback procedure documented

---

## Post-Deployment Testing

### Day 1
- [ ] Monitor CloudWatch for errors
- [ ] Check SQS queue depth
- [ ] Verify emails being sent
- [ ] Review Lambda cold starts

### Week 1
- [ ] Gather user feedback
- [ ] Review cost reports
- [ ] Optimize Lambda memory if needed
- [ ] Tune DynamoDB capacity

### Month 1
- [ ] Analyze usage patterns
- [ ] Plan feature enhancements
- [ ] Review security audit
- [ ] Update documentation

---

## Known Issues & Workarounds

### Issue 1: SES Sandbox Mode
**Problem:** Can only send to verified emails
**Workaround:** Request production access from AWS
**Test:** Verify recipient emails individually

### Issue 2: Cold Start Latency
**Problem:** First Lambda invocation slow (2-5 seconds)
**Workaround:** Enable Provisioned Concurrency (costs more)
**Test:** Acceptable for async workflow

### Issue 3: Mock Profile Collection
**Problem:** Using fake data from LinkedIn/Naukri
**Workaround:** Implement real API integrations
**Test:** Works for demonstration

### Issue 4: SQS Delay Limit
**Problem:** Maximum delay is 15 minutes for standard queue
**Workaround:** Already using longer delay, but may need Step Functions for production
**Test:** Works for 48-hour follow-up

---

## Testing Tools

### Recommended Tools
- **API Testing:** Postman, Insomnia, curl
- **Load Testing:** Apache Bench, Artillery, k6
- **Monitoring:** CloudWatch, X-Ray, Datadog
- **Debugging:** AWS CLI, LocalStack (local testing)
- **Frontend:** React DevTools, Chrome DevTools

### Test Data
```json
{
  "testJob": {
    "email": "test@example.com",
    "jobTitle": "Senior Full Stack Developer",
    "jobDescription": "We are seeking a highly skilled full stack developer with 5+ years of experience in React, Node.js, and AWS. The ideal candidate will have strong problem-solving skills and experience with microservices architecture.",
    "token": "test-jwt-token"
  }
}
```

---

## Success Criteria

✅ **Feature is production-ready when:**
1. All 26 tests pass
2. No critical bugs
3. Performance meets targets
4. Documentation complete
5. User acceptance testing successful
6. Security review approved
7. Cost projections validated

---

**Testing Time Estimate:**
- Unit Testing: 1 hour
- Integration Testing: 2 hours
- Frontend Testing: 1 hour
- Performance Testing: 30 minutes
- Security Testing: 1 hour
- **Total: ~5.5 hours**

Good luck with testing! 🚀
