# HR Robots - AI-Powered Interview & Assessment Platform

**Streamline your hiring process with AI-powered tools**

🌐 **Website**: [HRRobots.com](https://hrrobots.com)

## 📹 Demo Videos

- **Quick Demo (45 seconds)**: [Watch on YouTube](https://www.youtube.com/watch?v=4r-FyxGNWtg)
- **Full Demo (7:37 minutes)**: [Watch on YouTube](https://www.youtube.com/watch?v=yq2vIY_Pt-A)

---

## 🚀 Overview

HR Robots is a comprehensive AI-powered platform designed to revolutionize the recruitment and candidate assessment process. Built with React and AWS Lambda, it combines intelligent automation with robust proctoring to deliver secure, efficient, and insightful hiring workflows.

---

## ✨ Key Features

### 🤖 AI-Powered Tools

#### 1. **Job Description Generator**
- Generate professional, role-specific job descriptions in seconds
- AI-driven content based on role, experience, skills, and project context
- Exportable and printable formats
- Customizable templates for different roles

#### 2. **Candidate Profiler**
- Upload resume and job description (PDF format)
- AI-powered suitability analysis and skill matching
- Batch profiling — match one JD against multiple resumes simultaneously
- Comprehensive reports including:
  - Suitability score
  - Matching skills
  - Skill gaps
  - Additional strengths
  - Suggested improvements
  - Overall recommendations
- Generate candidate-specific tests directly from profiler reports

#### 3. **AI Question Generation**
- Automatically generate relevant questions by topic
- Multiple question types: MCQ, Range, Elaborate Answer, Code Solution
- Multiple difficulty levels: Fresher, Intermediate, Advanced, Expert, Super Advanced
- Generate up to 20 questions at once
- Topic-based organization (JavaScript, Python, React, AWS, etc.)
- Create templates from Job Descriptions — extract keywords and generate topic-specific questions
- Candidate-specific test generation from resumes using keyword matching
- Project analysis mode — generate scenario-based questions from candidate project experience

### 📝 Assessment & Testing

#### 4. **Template Management**
- Create custom assessment templates with rich text editor (CKEditor 5)
- Manual and AI-powered question creation — consistent display format for both
- Support for multiple question types: MCQ, Range, Elaborate, Code, Range with Two Questions
- Topic-based filtering, grouping, and organization
- Templates support 5–60 questions
- Edit, clone, and delete templates
- Assign templates to specific recruiters or reviewers (hiring managers)
- Template history tracking — full audit trail of creation, assignment, approval, and modification events
- Template approval workflow — assign for review → approve → assign to recruiter
- Configurable test settings per template: duration, question count, sensitivity, allowed defaults
- Psychometric report mode for personality/aptitude assessments

#### 5. **Test Administration**
- Generate unique test links for candidates
- Bulk test creation via CSV upload (candidate name + email)
- Email test links directly to candidates
- Candidate-specific tests tailored to individual resumes
- Candidate Apply portal — candidates submit resumes, system auto-generates personalized test links
- Track test status (Not Started, In Progress, Completed, Terminated)
- Test count limits enforced per account (max 25 active tests)
- Delete individual test transactions

#### 6. **Advanced Proctoring System**
- **Camera Monitoring**: Continuous face detection during tests
- **Audio Detection**: Monitor for unauthorized speech
- **Screen Monitoring**: Detect fullscreen exits and window switching
- **Screenshot Prevention**: Automatic test termination on screenshot attempts
- **Multi-screen Detection**: Prevent use of multiple monitors
- **Random Photo Capture**: Periodic candidate verification
- **Violation Tracking**: Three-strike system with warnings

### 📊 Analytics & Reporting

#### 7. **Comprehensive Results Dashboard**
- Search by candidate name or test ID
- Visual score gauges and breakdowns
- Topic-wise performance analysis
- Question-by-question review with correct/incorrect indicators
- View captured candidate photos in a catalog
- Submission timestamps and test status indicators
- Export/download full assessment report as CSV
- Pagination, sorting, and filtering across all test results

#### 8. **AI-Generated Analytics**
- Detailed performance insights
- Skill assessment by topic
- Strengths and weaknesses analysis
- Professional printable reports
- Historical performance tracking

### 🔐 Identity Verification

#### 9. **Multi-Step Verification**
- Webcam photo capture
- Government ID verification
- Face alignment guides
- GDPR and data protection compliance
- Secure storage of verification data

### 👥 User Management

#### 10. **Profile & Account Settings**
- Password management with secure requirements
- User invitation system (invite colleagues via email)
- S3 configuration (custom bucket key and ID)
- LLM API key management (OpenAI, Claude, Gemini, Mistral, AWS Nova)
- Account deletion with reason tracking and confirmation
- Session management

#### 11. **Admin Dashboard** (For authorized users)
- Platform-wide analytics and metrics
- User activity logs with filters (by user, action, activity type, status)
- System-wide performance monitoring
- Template management across teams

#### 12. **Admin Maintenance Tools**
- Database cleanup utilities with confirmation dialogs:
  - Delete all test transactions and associated S3 photos
  - Delete all MCQ answers
  - Clean orphaned questions (referencing missing templates)
  - Comprehensive orphaned question cleanup
  - Clean orphaned test transactions
  - Clean orphaned S3 photo records

### 📧 Communication

#### 13. **Email Integration**
- Send test invitations directly from platform
- Send invitations to colleagues to join HR Robots
- SMTP integration via dedicated Lambda
- Custom email templates per use case

### 🎓 Product Tour

#### 14. **Guided Onboarding Tour**
- Interactive step-by-step product tour for new users
- Highlights key features on first login
- Tour can be replayed at any time
- Backend-persisted tour completion status

---

## 🛡️ Security Features

- **GDPR & Data Protection Compliant**
- **End User License Agreement (EULA)**
- **JWT authentication — token passed in `Authorization` header only (not in request body)**
- **Automatic 401/403 handling — session terminated and redirected to login on any API auth failure**
- **Toast notification on session expiry or access denial**
- **Password hashing and encryption**
- **Google reCAPTCHA v3 integration**
- **Clipboard access prevention**
- **Secure API endpoints with HTTP status pre-checks before body parsing**

---

## 🔄 Session Management

All API calls implement centralized session handling via `useSessionHandler`:

- **401 Unauthorized** → "Session Expired" toast → logout → redirect to `/login`
- **403 Forbidden** → "Access Denied" toast → logout → redirect to `/login`
- Two-layer detection: raw HTTP status (`checkHttpStatus`) checked before `.json()`, plus body-level checks (`checkUnauthorized`) for Lambda proxy responses
- Current path saved before redirect so users land back where they were after re-login
- Consistent behavior across all 50+ authenticated API calls

---

## 🎯 Candidate Test Experience

### System Check
Candidates must grant:
- Camera permission
- Microphone permission
- Clipboard permission
- Single screen verification

### Test Guidelines
- Maintain camera and microphone activity
- Stay in fullscreen mode
- Keep face visible
- No window switching
- Screenshot prevention

### Data Consent
- GDPR compliance notice
- India's Digital Personal Data Protection Act compliance
- Full consent document review required

### Identity Verification
- Live photo capture
- Government ID photo upload
- Visual alignment guides

### During Test
- Live timer countdown
- Question navigation
- Progress tracking
- Real-time proctoring
- Warning system for violations
- Automatic termination on repeated violations

---

## 🏗️ Technical Stack

### Frontend
- **React 19** — UI framework
- **React Router DOM 7** — Navigation
- **CKEditor 5** — Rich text editing for questions and answers
- **TensorFlow.js** — Face detection
- **face-api.js** — Facial recognition
- **Prism.js** — Code syntax highlighting
- **html2canvas** — Screenshots and reports
- **react-webcam** — Camera integration
- **react-speech-recognition** — Voice recognition
- **papaparse** — CSV parsing for bulk test upload
- **pdfjs-dist** — PDF text extraction (resumes, JDs)

### Backend
- **AWS Lambda** — Serverless functions (80+ functions)
- **Amazon API Gateway** — REST API endpoints
- **Amazon DynamoDB** — NoSQL database
- **Amazon S3** — File and photo storage
- **Amazon SES** — Email service
- **Lambda Function URLs** — Admin maintenance endpoints

### Development Tools
- **Webpack 5** — Module bundler
- **Babel** — JavaScript transpiler

---

## 📦 Installation

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- AWS account with configured credentials

### Setup Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd HRRobotsLive
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure AWS credentials**
Edit `aws-credentials.txt` with your AWS credentials:
```
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_DEFAULT_REGION=us-east-1
```

4. **Start development server**
```bash
npm start
```

5. **Build for production**
```bash
npm run build
```

6. **Deploy**
```bash
npm run serve
```

---

## 🌐 Backend Architecture

The platform uses 80+ AWS Lambda functions and 6 Lambda Function URLs organized by functionality:

### Core Functions
- **Authentication**: `login`, `authenticate`, `validateUser`, `AuthFunction`
- **User Management**: `userCreate`, `userUpdate`, `userDel`, `userCurd`, `getUser`
- **Templates**: `createTemplate`, `editTemplate`, `deleteTemplate`, `getTemplates`, `cloneGKTemplate`, `logTemplateHistory`, `getTemplateHistory`
- **Questions**: `createQuestionsUsingAI__`, `saveQuestions_`, `getQuestions`, `getTemplateQuestions`, `getQuestionsTopic`, `getQuestionReview`, `extractKeywordsFromJD`, `extractProjectsAndGenerateQuestions`
- **Tests**: `createTest`, `createBulkTests`, `checkTestStatus`, `changeTestStatus`, `listTestsWithStatus_`, `getTestCount`, `deleteTestTransaction`, `setTestConfiguration`, `getTestConfiguration`
- **Answers**: `api/saveAnswers`, `saveAnswerSubmitted`, `doSubmitAndCalculateScore___`
- **Results**: `checkResult_`, `getAnalytics`, `getTopicScore`
- **Email**: `sendEmailSMTP`
- **JD & Profiling**: `generatejd`, `matchJDResume`, `matchJDResumeMultiple`, `extractKeywordsFromJD`, `candidateApply`
- **Admin**: `getAdminDashboard`, `getActivityLogs`, `logActivity`
- **Photos**: `saveCandidatePhoto_`, `getPhotosUsingTestID`
- **Logging**: `logTemplateHistory`, `logActivity`
- **Assignment**: `Assignedto`

### Admin Maintenance (Lambda Function URLs)
- `deleteAllTestTransactions` — Remove all test records and S3 photos
- `delAllMCQAnswers` — Remove all MCQ answer records
- `delQuestionIfTemplateNotFound` — Clean orphaned questions
- `deleteAllOrphanedQuestions` — Comprehensive orphaned data cleanup
- `deltestTransactionsIfTemplateNotFound` — Clean orphaned transactions
- `delOldPhotoRecords` — Clean stale S3 photo references

---

## 📡 API Inventory

A complete API inventory is maintained in `HRRobots_API_Inventory.xlsx` with:
- 59 documented endpoints across 13 categories
- In-session vs out-of-session classification
- API Gateway ID and route mapping
- Source component references
- Description of each endpoint's purpose

**Categories:** Authentication · Test Management · Questions · Answers & Scoring · Templates · Analytics · Proctor · Logging · Resume/JD · Email · Feedback · Admin/Maintenance

---

## 📁 Project Structure

```
HRRobotsLive/
├── backend/               # AWS Lambda functions (80+ functions)
│   ├── checkEmail/
│   ├── createQuestionsUsingAI/
│   ├── login/
│   └── ...
├── public/                # Public assets
│   ├── models/           # face-api.js ML models
│   ├── index.html
│   └── logo.png
├── src/                  # React source code
│   ├── components/       # React components (80+ files)
│   ├── services/         # Service layers (answer queue, model preloader)
│   ├── styles/           # CSS stylesheets
│   ├── utils/            # Utility functions
│   │   ├── activityLogger.js      # User activity logging
│   │   ├── templateHistoryLogger.js # Template audit trail
│   │   └── performanceMonitor.js  # Performance tracking
│   ├── useSessionHandler.js  # Centralized 401/403 handler
│   ├── globalContext.js      # Auth + navigation context
│   ├── App.js               # Main app component & routing
│   └── index.js
├── HRRobots_API_Inventory.xlsx  # Complete API documentation (59 endpoints)
├── package.json          # Project metadata
└── README.md             # This file
```

---

## 🔑 Environment Variables

Required environment variables (configure in `aws-credentials.txt`):
- `AWS_ACCESS_KEY_ID` — AWS access key
- `AWS_SECRET_ACCESS_KEY` — AWS secret key
- `AWS_DEFAULT_REGION` — AWS region (default: us-east-1)

Google reCAPTCHA:
- Site key configured in `App.js`

---

## 🎨 Design Principles

- **Modern & Clean UI** — Professional interface with intuitive navigation
- **Accessibility** — WCAG compliant with keyboard navigation and skip links
- **Responsive Design** — Works across desktop, tablet, and mobile
- **Performance Optimized** — Lazy loading, code splitting, background model preloading
- **Security First** — JWT in Authorization header only, centralized session handling
- **Consistent Formatting** — AI-generated and manually-added questions render identically

---

## 🔄 Changelog

### Version 2.0.0 — August 2026

#### 🔒 Security & Authentication
- **Centralized 401/403 handler** (`useSessionHandler`) — all API calls now automatically detect auth failures, show a toast, terminate the session, and redirect to `/login`
- **`checkHttpStatus`** — new function checks raw HTTP response status before parsing body, catching API Gateway-level 401/403 before Lambda even runs
- **JWT token moved to `Authorization` header** — token removed from all request bodies across 20+ components and utility files; now passed exclusively as `Authorization` header
- Consistent token passing pattern: `"Authorization": JWTValue` in headers, no `token` field in body

#### 📋 Template History & Audit Trail
- **Template history modal** — full timeline view of template events (created, assigned, approved, modified)
- **`logTemplateHistory`** — backend call to record every template lifecycle event
- Template assignment workflow with role-based access (Recruiter / Reviewer)
- Template approval flow for hiring managers

#### 📊 API Inventory Documentation
- **`HRRobots_API_Inventory.xlsx`** — complete inventory of all 59 API endpoints
- Two-sheet workbook: detailed inventory + summary by category
- Documents: route, HTTP method, API Gateway ID, in/out session flag, description, source component

#### 🎯 Candidate Apply Portal
- Candidates apply directly via shareable link (`/apply/:templateId`)
- Recruiters configure job description and match threshold per template
- AI-powered resume matching with configurable suitability threshold
- Application list with real-time test status and score lookup
- Generate profiler report for any applicant

#### 🤖 AI Improvements
- **`extractProjectsAndGenerateQuestions`** — generates scenario-based questions from candidate project experience
- Candidate-specific test generation with keyword matching between resume and template topics
- Batch resume profiling (`matchJDResumeMultiple`)

#### 🐛 Bug Fixes
- **Question display format** — manually-added questions via "Add Question" form now render with the same layout as AI-generated questions
- Fixed `<p>` tag injection inside `<h4>` (invalid HTML) that caused question text and options to appear unstyled
- `unwrapP` helper strips single `<p>` wrappers at display time for correct inline rendering
- Replaced `escapeHtml` (which caused double-encoding) with `toHtml` that wraps plain text in `<p>` tags to match RichTextEditor format
- `topic` field now correctly propagated in `editTemplate.js` AI generation

#### 🗄️ Admin Maintenance
- Admin Cleanup page with 6 database maintenance operations
- All operations require explicit confirmation before execution
- Lambda Function URL endpoints for destructive operations

---

## 🌟 Highlights

✅ **AI-Powered** — Intelligent automation throughout the hiring process  
✅ **Secure** — JWT in Authorization header only, automatic session termination on 401/403  
✅ **Scalable** — Serverless architecture with 80+ AWS Lambda functions  
✅ **Comprehensive** — End-to-end hiring workflow from JD to results  
✅ **Consistent** — Uniform question formatting regardless of creation method  
✅ **Documented** — Full API inventory with 59 endpoints catalogued  
✅ **Compliant** — GDPR and India DPDP Act data protection standards  

---

## 🤝 Contributing

We welcome contributions from the community!

### Ways to Contribute
- 🐛 **Report bugs** — Create an issue describing the problem
- 💡 **Suggest features** — Share your ideas for improvements
- 📝 **Improve documentation** — Help make our docs clearer
- 🔧 **Submit pull requests** — Fix bugs or add features
- ⭐ **Star the repo** — Show your support!

### Getting Started
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add: amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🤝 Support

For support and inquiries:
- **Website**: [HRRobots.com](https://hrrobots.com)
- **Demo Videos**: [YouTube Channel](https://www.youtube.com/@hrrobots)
- **Issues**: [GitHub Issues](https://github.com/your-org/HRRobotsLive/issues)

---

**Made with ❤️ by the HR Robots Team**

*Transforming recruitment with artificial intelligence*
