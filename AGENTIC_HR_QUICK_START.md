# Agentic HR - Quick Start Guide

## What is Agentic HR?

Agentic HR is an **autonomous hiring assistant** that automates the entire recruitment pipeline:

1. 🔍 **Collects** candidate profiles from LinkedIn, Naukri, Monster
2. 🤖 **Profiles** candidates using AI against your job description
3. 📝 **Generates** custom assessment tests automatically
4. 📧 **Sends** test invitations to qualified candidates
5. ⏰ **Follows up** with reminders for incomplete tests
6. 📊 **Ranks** and presents top 25 candidates with analytics

## 5-Minute Setup

### Prerequisites
- AWS Account
- AWS CLI installed and configured
- Node.js installed (for frontend)

### Step 1: Deploy Backend (2 minutes)

**Windows:**
```powershell
.\deploy-agentic-hr.ps1
```

**Mac/Linux:**
```bash
chmod +x deploy-agentic-hr.sh
./deploy-agentic-hr.sh
```

This script creates:
- 3 DynamoDB tables
- 1 SQS queue
- 8 Lambda functions
- SES email verification

### Step 2: Configure API Gateway (2 minutes)

1. Go to AWS Console → API Gateway
2. Create a new REST API or use existing
3. Create these resources under `/agenticHR`:
   - `/submitJob` (POST) → Lambda: `agenticHR_submitJob`
   - `/listJobs` (POST) → Lambda: `agenticHR_listJobs`
   - `/getJobDetails` (POST) → Lambda: `agenticHR_getJobDetails`
4. Enable CORS for all endpoints
5. Deploy API to stage (e.g., `dev`)

### Step 3: Update Frontend (1 minute)

Edit `src/components/agenticHR.js` and update API URLs:

```javascript
// Replace this URL with your API Gateway endpoint
const API_BASE = 'https://YOUR_API_ID.execute-api.us-east-1.amazonaws.com/dev';

// Update these lines:
const response = await fetch(`${API_BASE}/agenticHR/submitJob`, {
const response = await fetch(`${API_BASE}/agenticHR/listJobs`, {
const response = await fetch(`${API_BASE}/agenticHR/getJobDetails`, {
```

### Step 4: Build & Deploy Frontend

```bash
npm run build
aws s3 sync build/ s3://your-bucket-name/
```

## Usage

### 1. Access the Feature
- Login to HR Robots
- Click on **"Agentic HR"** card on the dashboard

### 2. Submit a Job
- Click **"New Job"** button
- Enter job title (e.g., "Senior Full Stack Developer")
- Paste complete job description
- Click **"Start Agentic Process"**

### 3. Monitor Progress
The job card will show real-time status:
- 🔵 **Collecting Profiles** - Gathering candidates from job portals
- 🟡 **Profiling Candidates** - AI analyzing resumes vs JD
- 🟣 **Generating Tests** - Creating custom assessments
- 🔵 **Sending Invites** - Emailing test links
- 🟣 **Following Up** - Sending reminders
- 🟢 **Completed** - Ready to view results

### 4. View Results
Click on the job card to see:
- **Top 25 Candidates** ranked by combined score
- **Match Score** (how well they fit the JD)
- **Test Score** (assessment performance)
- **Test Status** (invited, completed, reminded)
- **Source** (LinkedIn, Naukri, Monster)

## Architecture Flow

```
User Submits JD
    ↓
┌─────────────────────────────────────────┐
│  agenticHR_submitJob Lambda             │
│  - Stores job in DynamoDB               │
│  - Sends message to SQS                 │
└─────────────────────────────────────────┘
    ↓ (SQS Message)
┌─────────────────────────────────────────┐
│  agenticHR_collectProfiles Lambda       │
│  - Searches LinkedIn, Naukri, Monster   │
│  - Stores candidates (~25 per source)   │
│  - Sends profiling message              │
└─────────────────────────────────────────┘
    ↓ (SQS Message)
┌─────────────────────────────────────────┐
│  agenticHR_profileCandidates Lambda     │
│  - Uses AWS Bedrock AI                  │
│  - Analyzes resume vs JD                │
│  - Calculates match score (0-100)       │
│  - Sends test generation message        │
└─────────────────────────────────────────┘
    ↓ (SQS Message)
┌─────────────────────────────────────────┐
│  agenticHR_generateTests Lambda         │
│  - Uses AI to create 10 MCQ questions   │
│  - Stores test in DynamoDB              │
│  - Sends invitation message             │
└─────────────────────────────────────────┘
    ↓ (SQS Message)
┌─────────────────────────────────────────┐
│  agenticHR_sendInvites Lambda           │
│  - Sends emails via AWS SES             │
│  - Includes unique test link            │
│  - Schedules follow-up (48h delay)      │
└─────────────────────────────────────────┘
    ↓ (SQS Message, 48h delayed)
┌─────────────────────────────────────────┐
│  agenticHR_sendFollowups Lambda         │
│  - Checks incomplete tests              │
│  - Sends reminder emails                │
│  - Marks job as completed               │
└─────────────────────────────────────────┘
```

## Key Features

### 🤖 AI-Powered Profiling
- Uses Amazon Nova (AWS Bedrock)
- Matches candidates to JD requirements
- Identifies strengths and gaps
- Assigns match score 0-100%

### 📊 Smart Ranking
Candidates ranked by:
1. **Test Score** (primary) - Actual assessment performance
2. **Match Score** (secondary) - AI-calculated JD fit

### 📧 Automated Communication
- Professional email templates
- Personalized invitations
- Automatic follow-ups after 48 hours
- Status tracking per candidate

### 🎯 Top 25 View
- Quickly identify best candidates
- See detailed profiles
- Access source profiles (LinkedIn, etc.)
- Filter by test status

## Customization

### Change Profile Sources
Edit `backend/agenticHR_collectProfiles/lambda_function.py`:
```python
# Add your custom job portal
def search_custom_portal(job_title, job_description):
    # Your scraping logic
    return profiles
```

### Modify Email Templates
Edit `backend/agenticHR_sendInvites/lambda_function.py`:
```python
body_html = f"""
<html>
  <body>
    <!-- Your custom HTML -->
  </body>
</html>
"""
```

### Adjust Follow-up Timing
Edit `backend/agenticHR_sendInvites/lambda_function.py`:
```python
# Change from 48 hours (172800 seconds)
DelaySeconds=86400  # 24 hours
```

### Change Number of Test Questions
Edit `backend/agenticHR_generateTests/lambda_function.py`:
```python
text: f"""
Generate 20 multiple choice questions...  # Change from 10 to 20
"""
```

## Troubleshooting

### Problem: Emails not sending
**Solution:**
1. Verify SES email: Check inbox for verification link
2. Check SES sandbox mode: May need to verify recipient emails
3. Review Lambda logs: `aws logs tail /aws/lambda/agenticHR_sendInvites --follow`

### Problem: No profiles collected
**Solution:**
1. Check SQS queue: `aws sqs receive-message --queue-url YOUR_QUEUE_URL`
2. Verify Lambda triggers: Console → Lambda → Configuration → Triggers
3. Check CloudWatch logs for errors

### Problem: AI profiling fails
**Solution:**
1. Verify Bedrock access in IAM role
2. Check model ID: `amazon.nova-lite-v1:0`
3. Review token limits (4000 max_new_tokens)

### Problem: Job status stuck
**Solution:**
1. Check Lambda execution errors in CloudWatch
2. Verify SQS messages are being processed
3. Manually update job status in DynamoDB if needed

## Cost Estimation

For 10 jobs with 250 candidates total:

| Service | Usage | Cost |
|---------|-------|------|
| DynamoDB | 5 GB, 100K reads, 50K writes | ~$2.50 |
| Lambda | 50K invocations, 512MB, 30s avg | ~$1.50 |
| SES | 250 emails | ~$0.03 |
| SQS | 50K messages | ~$0.05 |
| Bedrock | 250 profiling + 10 test gen | ~$5.00 |
| **Total** | **Per month** | **~$9.08** |

## Security Best Practices

1. **Use JWT authentication** for all API calls
2. **Encrypt sensitive data** in DynamoDB
3. **Limit SES sending** to verified domains
4. **Enable CloudWatch logging** for all Lambdas
5. **Set up API Gateway throttling** to prevent abuse
6. **Use IAM roles** with least privilege principle
7. **Enable DynamoDB encryption** at rest

## Support & Resources

- 📚 Full Documentation: `AGENTIC_HR_README.md`
- 🐛 Report Issues: GitHub Issues
- 💬 Discussion: GitHub Discussions
- 📧 Email: support@hrrobots.click

## Next Steps

1. **Test the workflow** with a real job description
2. **Monitor CloudWatch** logs during first run
3. **Adjust AI prompts** for better profiling
4. **Customize email templates** with your branding
5. **Add more job portals** to profile collection

---

**Pro Tip:** Start with SES sandbox mode to test the entire workflow. Once confirmed working, request production access from AWS SES.
