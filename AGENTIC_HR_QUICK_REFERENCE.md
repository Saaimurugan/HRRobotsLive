# Agentic HR - Quick Reference Card

## 🚀 Quick Deploy (5 Commands)

```powershell
# 1. Deploy AWS resources
.\deploy-agentic-hr.ps1

# 2. Update frontend API URLs in src/components/agenticHR.js (lines 175, 135, 195, 142)

# 3. Build frontend
npm run build

# 4. Deploy to S3
aws s3 sync build/ s3://your-bucket/

# 5. Test it!
# Navigate to https://yoursite.com/agenticHR
```

## 📋 API Endpoints to Configure

```
POST /agenticHR/submitJob → agenticHR_submitJob
POST /agenticHR/listJobs → agenticHR_listJobs  
POST /agenticHR/getJobDetails → agenticHR_getJobDetails
POST /extractPDF → extractPDF
```

## 🎯 Feature Checklist

### ✅ Implemented
- [x] Card on dashboard
- [x] Profile collection (LinkedIn, Naukri, Monster)
- [x] AI-powered profiling with match scores
- [x] Automated test generation
- [x] Email invitations
- [x] 48-hour follow-ups
- [x] Top 25 candidate ranking
- [x] Job progress tracking
- [x] **PDF upload support** (NEW)
- [x] **Consistent design with Create JD** (NEW)

## 📁 Key Files

### Frontend
- `src/components/agenticHR.js` - Main component
- `src/agenticHR.css` - Styling
- `public/index.html` - PDF.js library

### Backend (9 Lambdas)
1. `agenticHR_submitJob` - Submit new job
2. `agenticHR_listJobs` - List user's jobs
3. `agenticHR_collectProfiles` - Scrape job portals
4. `agenticHR_profileCandidates` - AI profiling
5. `agenticHR_generateTests` - Create assessments
6. `agenticHR_sendInvites` - Email invitations
7. `agenticHR_sendFollowups` - Reminder emails
8. `agenticHR_getJobDetails` - Get results
9. `extractPDF` - Extract text from PDF

## 🔄 Workflow States

```
1. collecting     → Gathering profiles
2. profiling      → AI analyzing candidates
3. testing        → Generating assessment
4. inviting       → Sending emails
5. following_up   → Waiting & reminding
6. completed      → Ready to review
```

## 💾 Database Tables

```
AgenticHR_Jobs        - Job submissions
AgenticHR_Candidates  - Candidate profiles  
AgenticHR_Tests       - Assessment questions
```

## 🎨 CSS Variables Used

```css
--color-bg-gradient
--color-bg-primary
--color-bg-secondary
--color-text-primary
--color-text-secondary
--color-primary
--color-border
--font-size-* (sm, base, lg, xl, 2xl, 3xl)
--font-weight-* (medium, semibold, bold)
--radius-* (md, lg, xl)
--shadow-* (md, lg, primary)
```

## 📊 Cost Per Month (100 Jobs)

| Service | Cost |
|---------|------|
| DynamoDB | $25 |
| Lambda | $18 |
| Bedrock | $50 |
| SES | $1 |
| SQS | $0.50 |
| Textract | $5 |
| **Total** | **~$100** |

## 🐛 Common Issues

### PDF Not Extracting
- Check PDF.js loaded in browser console
- Verify extractPDF Lambda deployed
- Check file size < 10MB
- Test with simple PDF first

### Emails Not Sending
- Verify SES email in AWS Console
- Check SES sandbox mode limits
- Review Lambda CloudWatch logs
- Confirm recipient emails verified (sandbox)

### Design Not Matching
- Clear browser cache
- Check CSS variables defined in main CSS
- Verify agenticHR.css imported
- Inspect element for overrides

### API Errors
- Check API Gateway CORS enabled
- Verify Lambda permissions
- Check JWT token validity
- Review CloudWatch logs

## 📞 Quick Commands

### Check DynamoDB Tables
```bash
aws dynamodb list-tables | findstr AgenticHR
```

### View Lambda Logs
```bash
aws logs tail /aws/lambda/agenticHR_submitJob --follow
```

### Test Lambda Directly
```bash
aws lambda invoke --function-name agenticHR_submitJob --payload file://test.json response.json
```

### Check SQS Messages
```bash
aws sqs receive-message --queue-url YOUR_QUEUE_URL
```

### Verify SES Email
```bash
aws ses get-identity-verification-attributes --identities noreply@hrrobots.click
```

## 🎓 Testing Sequence

1. Upload text JD → Check job created
2. Upload PDF JD → Verify extraction
3. Wait 2 mins → Check profiles collected
4. Wait 5 mins → Check profiling done
5. Wait 8 mins → Check test generated
6. Check email → Verify invitation sent
7. Click job card → View top 25 candidates

## 📖 Documentation Files

1. **AGENTIC_HR_README.md** - Full docs (500+ lines)
2. **AGENTIC_HR_QUICK_START.md** - 5-min setup
3. **AGENTIC_HR_ARCHITECTURE.md** - System design
4. **AGENTIC_HR_TESTING_CHECKLIST.md** - 26 tests
5. **AGENTIC_HR_FINAL_SUMMARY.md** - Complete summary
6. **AGENTIC_HR_QUICK_REFERENCE.md** - This file

## 🔗 Useful Links

- AWS Lambda Console: https://console.aws.amazon.com/lambda
- DynamoDB Console: https://console.aws.amazon.com/dynamodb
- SES Console: https://console.aws.amazon.com/ses
- API Gateway Console: https://console.aws.amazon.com/apigateway
- CloudWatch Logs: https://console.aws.amazon.com/cloudwatch

## 🎯 Success Criteria

- [ ] Job submitted successfully
- [ ] ~75 profiles collected in 2 mins
- [ ] Match scores calculated (0-100%)
- [ ] Test with 10 questions generated
- [ ] Emails sent to candidates
- [ ] Top 25 displayed with rankings
- [ ] PDF upload works (both methods)
- [ ] Design matches Create JD page

---

**Need Help?** Check the detailed docs in AGENTIC_HR_README.md
**Quick Setup?** Follow AGENTIC_HR_QUICK_START.md
**System Design?** Review AGENTIC_HR_ARCHITECTURE.md

**Status**: ✅ Ready for Production!
