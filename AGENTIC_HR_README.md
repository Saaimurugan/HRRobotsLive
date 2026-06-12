# Agentic HR - Automated End-to-End Hiring System

## Overview

Agentic HR is a fully automated hiring feature that streamlines the entire recruitment process from profile collection to candidate assessment. It uses AI and automation to handle repetitive tasks, allowing HR teams to focus on decision-making.

## Features

### 1. **Automated Profile Collection**
- Collects candidate profiles from multiple job portals:
  - LinkedIn
  - Naukri.com
  - Monster.com
  - Other job boards (extensible)
- Extracts resume data and contact information
- Stores candidates in a centralized database

### 2. **AI-Powered Candidate Profiling**
- Uses AWS Bedrock (Amazon Nova) to analyze candidates
- Matches candidate skills against job description
- Generates match scores (0-100%)
- Identifies strengths and gaps for each candidate
- Ranks candidates based on suitability

### 3. **Automated Test Generation**
- Creates custom assessment questions using AI
- Generates MCQ tests based on job requirements
- Tailored to specific roles and skill levels
- 10 questions per assessment by default

### 4. **Test Invitation System**
- Automatically sends personalized test invitations via email
- Generates unique test links for each candidate
- Professional email templates with branding
- Tracks invitation status

### 5. **Follow-Up Automation**
- Automatically sends reminder emails after 48 hours
- Tracks candidates who haven't completed tests
- Customizable follow-up schedules
- Updates candidate status in real-time

### 6. **Analytics Dashboard**
- Displays top 25 candidates based on:
  - Match score
  - Test performance
  - Combined ranking
- Shows all candidates with filtering options
- Real-time progress tracking
- Detailed candidate information

## Architecture

### Frontend Components
- **agenticHR.js**: Main React component with three views:
  - Main dashboard (job list)
  - Create job form
  - Candidate details view
- **agenticHR.css**: Responsive styling with modern UI

### Backend Lambda Functions

#### 1. `agenticHR_submitJob`
- **Purpose**: Submit new job for agentic process
- **Trigger**: API Gateway (POST)
- **Actions**:
  - Stores job in DynamoDB
  - Initiates SQS workflow
  - Returns job ID to frontend

#### 2. `agenticHR_collectProfiles`
- **Purpose**: Collect profiles from job portals
- **Trigger**: SQS Queue
- **Actions**:
  - Searches LinkedIn, Naukri, Monster
  - Stores candidate profiles
  - Triggers profiling step

#### 3. `agenticHR_profileCandidates`
- **Purpose**: AI-powered candidate profiling
- **Trigger**: SQS Queue
- **Actions**:
  - Uses AWS Bedrock to analyze resumes
  - Calculates match scores
  - Stores profiling results
  - Triggers test generation

#### 4. `agenticHR_generateTests`
- **Purpose**: Generate assessment tests
- **Trigger**: SQS Queue
- **Actions**:
  - Uses AI to create questions
  - Stores test in DynamoDB
  - Triggers invitation sending

#### 5. `agenticHR_sendInvites`
- **Purpose**: Send test invitations
- **Trigger**: SQS Queue
- **Actions**:
  - Sends emails via AWS SES
  - Updates candidate status
  - Schedules follow-ups

#### 6. `agenticHR_sendFollowups`
- **Purpose**: Send reminder emails
- **Trigger**: SQS Queue (delayed)
- **Actions**:
  - Identifies incomplete tests
  - Sends reminder emails
  - Updates tracking

#### 7. `agenticHR_listJobs`
- **Purpose**: List all jobs for a user
- **Trigger**: API Gateway (POST)
- **Actions**:
  - Queries user's jobs
  - Returns job list with status

#### 8. `agenticHR_getJobDetails`
- **Purpose**: Get detailed job information
- **Trigger**: API Gateway (POST)
- **Actions**:
  - Returns all candidates
  - Returns top 25 ranked candidates
  - Includes job statistics

### Database Tables (DynamoDB)

#### AgenticHR_Jobs
```
Primary Key: jobId (String)
GSI: email-index (email)

Attributes:
- jobId: Unique job identifier
- email: User email
- jobTitle: Job title
- jobDescription: Full JD text
- status: collecting | profiling | testing | inviting | following_up | completed
- candidatesCount: Number of candidates
- testsCompleted: Number of completed tests
- invitedCount: Number invited
- remindedCount: Number reminded
- testId: Associated test ID
- createdAt: Timestamp
- updatedAt: Timestamp
```

#### AgenticHR_Candidates
```
Primary Key: candidateId (String)
GSI: jobId-index (jobId)

Attributes:
- candidateId: Unique candidate identifier
- jobId: Associated job
- email: Employer email
- name: Candidate name
- candidateEmail: Candidate email
- profileUrl: Source profile URL
- source: LinkedIn | Naukri | Monster
- resume: Resume text
- matchScore: 0-100 score
- strengths: Array of strengths
- gaps: Array of gaps
- status: collected | profiled | invited | reminded | completed
- testStatus: pending | invited | reminded | completed
- testScore: Test score (if completed)
- testLink: Unique test URL
- invitedAt: Timestamp
- remindedAt: Timestamp
- createdAt: Timestamp
```

#### AgenticHR_Tests
```
Primary Key: testId (String)
GSI: jobId-index (jobId)

Attributes:
- testId: Unique test identifier
- jobId: Associated job
- email: Employer email
- questions: Array of question objects
  - question: Question text
  - options: Array of options
  - correctAnswer: Correct option
- createdAt: Timestamp
```

### Message Queue (SQS)

**Queue Name**: AgenticHR-Queue

**Message Flow**:
1. submitJob → start_collection
2. collectProfiles → start_profiling
3. profileCandidates → generate_tests
4. generateTests → send_invites
5. sendInvites → send_followups (delayed 48h)

## Setup Instructions

### Prerequisites
- AWS Account with appropriate permissions
- AWS CLI configured
- Node.js and npm installed
- Python 3.12 for Lambda functions

### AWS Resources Setup

#### 1. Create DynamoDB Tables

```bash
# Create Jobs Table
aws dynamodb create-table \
  --table-name AgenticHR_Jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

# Create Candidates Table
aws dynamodb create-table \
  --table-name AgenticHR_Candidates \
  --attribute-definitions \
    AttributeName=candidateId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=candidateId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"jobId-index\",\"KeySchema\":[{\"AttributeName\":\"jobId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5

# Create Tests Table
aws dynamodb create-table \
  --table-name AgenticHR_Tests \
  --attribute-definitions \
    AttributeName=testId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=testId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"jobId-index\",\"KeySchema\":[{\"AttributeName\":\"jobId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5
```

#### 2. Create SQS Queue

```bash
aws sqs create-queue \
  --queue-name AgenticHR-Queue \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600
```

#### 3. Verify SES Email

```bash
aws ses verify-email-identity --email-address noreply@hrrobots.click
```

#### 4. Deploy Lambda Functions

Deploy each Lambda function in the `backend/agenticHR_*` directories:

```bash
cd backend/agenticHR_submitJob
zip -r function.zip .
aws lambda create-function --function-name agenticHR_submitJob \
  --runtime python3.12 \
  --role arn:aws:iam::YOUR_ACCOUNT:role/lambda-execution-role \
  --handler lambda_function.lambda_handler \
  --zip-file fileb://function.zip

# Repeat for all Lambda functions
```

#### 5. Configure API Gateway

Create API Gateway endpoints for:
- POST `/agenticHR/submitJob` → agenticHR_submitJob
- POST `/agenticHR/listJobs` → agenticHR_listJobs
- POST `/agenticHR/getJobDetails` → agenticHR_getJobDetails

#### 6. Configure SQS Triggers

Add SQS as trigger for these Lambda functions:
- agenticHR_collectProfiles
- agenticHR_profileCandidates
- agenticHR_generateTests
- agenticHR_sendInvites
- agenticHR_sendFollowups

### Frontend Deployment

1. **Build the project**:
```bash
npm run build
```

2. **Deploy to S3** (if using S3 + CloudFront):
```bash
aws s3 sync build/ s3://your-bucket-name/
```

## Usage Guide

### For Users

1. **Access Agentic HR**:
   - Navigate to the main dashboard
   - Click on "Agentic HR" card

2. **Submit a Job**:
   - Click "New Job" button
   - Enter job title
   - Paste job description
   - Click "Start Agentic Process"

3. **Monitor Progress**:
   - View job cards on main dashboard
   - Check status badges (Collecting, Profiling, Testing, etc.)
   - See progress bar and statistics

4. **View Candidates**:
   - Click on a job card
   - View top 25 candidates ranked by score
   - See all candidates in grid view
   - Check test completion status

5. **Analyze Results**:
   - Review match scores
   - Check test scores
   - View candidate sources
   - Access profile URLs

## Customization

### Modify Profile Sources

Edit `agenticHR_collectProfiles/lambda_function.py`:
```python
def search_custom_portal(job_title, job_description):
    # Add your custom job portal scraping logic
    profiles = []
    # ... your code
    return profiles
```

### Adjust Follow-up Timing

Edit `agenticHR_sendInvites/lambda_function.py`:
```python
# Change delay from 48 hours to desired time
DelaySeconds=172800  # Seconds (e.g., 86400 = 24 hours)
```

### Customize Email Templates

Edit email HTML in `agenticHR_sendInvites/lambda_function.py` and `agenticHR_sendFollowups/lambda_function.py`.

### Modify Test Questions

Edit `agenticHR_generateTests/lambda_function.py` to change:
- Number of questions
- Question difficulty
- Assessment format

## Monitoring and Troubleshooting

### CloudWatch Logs

Monitor Lambda execution:
```bash
aws logs tail /aws/lambda/agenticHR_submitJob --follow
```

### Check Job Status

Query DynamoDB directly:
```bash
aws dynamodb get-item \
  --table-name AgenticHR_Jobs \
  --key '{"jobId": {"S": "your-job-id"}}'
```

### Common Issues

1. **Emails not sending**:
   - Verify SES email is verified
   - Check SES sending limits
   - Review Lambda CloudWatch logs

2. **Profiles not collected**:
   - Check SQS queue for messages
   - Verify Lambda has SQS trigger
   - Check Lambda timeout settings

3. **AI profiling fails**:
   - Verify Bedrock access
   - Check model ID is correct
   - Review token limits

## Security Considerations

1. **API Authentication**: All API endpoints require JWT token validation
2. **Data Privacy**: Candidate data is encrypted at rest in DynamoDB
3. **Email Security**: Uses AWS SES with DKIM/SPF
4. **Access Control**: Jobs are scoped to user email
5. **Rate Limiting**: Implement API Gateway throttling

## Performance Optimization

1. **Batch Processing**: Process candidates in batches for large jobs
2. **Caching**: Cache test questions for similar roles
3. **Async Processing**: All heavy operations use SQS queues
4. **DynamoDB Optimization**: Use appropriate read/write capacity

## Future Enhancements

- [ ] Integration with actual LinkedIn/Naukri APIs
- [ ] Video interview scheduling
- [ ] AI-powered interview question generation
- [ ] Calendar integration for scheduling
- [ ] Advanced analytics and reporting
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Candidate chatbot
- [ ] Resume parsing improvements
- [ ] Salary negotiation automation

## Cost Estimation

Monthly costs for 100 jobs with 2500 candidates:

- DynamoDB: ~$25
- Lambda: ~$15
- SES: ~$1
- SQS: ~$0.50
- Bedrock: ~$50
- **Total: ~$91.50/month**

## Support

For issues or questions:
- GitHub Issues: [Create an issue]
- Email: support@hrrobots.click
- Documentation: [Link to docs]

## License

Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
SPDX-License-Identifier: Apache-2.0
