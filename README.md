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
- Comprehensive reports including:
  - Suitability score
  - Matching skills
  - Skill gaps
  - Additional strengths
  - Suggested improvements
  - Overall recommendations

#### 3. **AI Question Generation**
- Automatically generate relevant MCQ questions by topic
- Multiple difficulty levels: Fresher, Intermediate, Advanced, Expert, Super Advanced
- Generate up to 20 questions at once
- Topic-based organization (JavaScript, Python, React, AWS, etc.)

### 📝 Assessment & Testing

#### 4. **Template Management**
- Create custom assessment templates
- Manual and AI-powered question creation
- Support for multiple question types
- Topic-based filtering and organization
- Templates support 5-60 questions
- Edit, clone, and delete templates
- Assign templates to specific recruiters

#### 5. **Test Administration**
- Generate unique test links for candidates
- Configure test settings:
  - Duration
  - Difficulty level
  - Question count
  - Test instructions
- Email test links directly to candidates
- Track test status (In Progress, Completed, Terminated)

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
- View captured candidate photos
- Submission timestamps
- Test status indicators

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
- User invitation system
- Business email validation
- Account deletion with confirmation
- Session management

#### 11. **Admin Dashboard** (For authorized users)
- Platform analytics and metrics
- User activity logs
- System-wide performance monitoring
- Template management across teams

### 📧 Communication

#### 12. **Email Integration**
- Send test invitations directly from platform
- Automated notifications
- SMTP integration
- Custom email templates

---

## 🛡️ Security Features

- **GDPR & Data Protection Compliant**
- **End User License Agreement (EULA)**
- **Secure authentication with JWT tokens**
- **Password hashing and encryption**
- **Session timeout protection**
- **Google reCAPTCHA v3 integration**
- **Clipboard access prevention**
- **Secure API endpoints**

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
- **React 19** - UI framework
- **React Router DOM 7** - Navigation
- **Axios** - HTTP client
- **TensorFlow.js** - Face detection
- **face-api.js** - Facial recognition
- **CKEditor 5** - Rich text editing
- **Prism.js** - Code syntax highlighting
- **html2canvas** - Screenshots and reports
- **react-webcam** - Camera integration
- **react-speech-recognition** - Voice recognition

### Backend
- **AWS Lambda** - Serverless functions (76+ functions)
- **Amazon API Gateway** - REST API endpoints
- **Amazon DynamoDB** - NoSQL database
- **Amazon S3** - File storage
- **Amazon SES** - Email service
- **Amazon Cognito** - Authentication (if applicable)

### Development Tools
- **Webpack 5** - Module bundler
- **Babel** - JavaScript transpiler
- **TypeScript** - Type safety

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

6. **Serve production build**
```bash
npm run serve
```

---

## 🌐 Backend Architecture

The platform uses 76+ AWS Lambda functions organized by functionality:

### Core Functions
- **Authentication**: `login`, `authenticate`, `validateUser`, `AuthFunction`
- **User Management**: `userCreate`, `userUpdate`, `userDel`, `userCurd`, `getUser`
- **Templates**: `createTemplate`, `editTemplate`, `deleteTemplate`, `getTemplates`, `cloneGKTemplate`
- **Questions**: `createQuestionsUsingAI`, `saveQuestions`, `getQuestions`, `getTemplateQuestions`
- **Tests**: `createTest`, `checkTestStatus`, `changeTestStatus`, `makeTestComplete`
- **Answers**: `saveAnswers`, `saveAnswerSubmitted`, `doSubmitAndCalculateScore`
- **Results**: `checkResult`, `getAnalytics`, `getQuestionReview`, `getTopicScore`
- **Email**: `sendEmail`, `sendEmailSMTP`, `checkEmail`
- **JD & Profiling**: `generatejd`, `matchJDResume`, `extractKeywordsFromJD`
- **Admin**: `getAdminDashboard`, `createInitialAdmin`
- **Analytics**: `getActivityLogs`, `logActivity`, `getTestCount`
- **Photos**: `saveCandidatePhoto`, `getPhotosUsingTestID`
- **AI Interview**: `VoiceInterview`, `elaborateAnswerScore`

All Lambda functions are stored in the `backend/` folder, organized by function name.

---

## 📁 Project Structure

```
HRRobotsLive/
├── backend/               # AWS Lambda functions (76+ functions)
│   ├── checkEmail/
│   ├── getUser/
│   ├── login/
│   └── ...
├── frontend/             # Frontend assets
├── public/               # Public assets
│   ├── models/          # face-api.js ML models
│   ├── index.html
│   └── logo.png
├── src/                 # React source code
│   ├── components/      # React components (77 files)
│   ├── services/        # Service layers
│   ├── styles/          # CSS stylesheets
│   ├── utils/           # Utility functions
│   ├── App.js           # Main app component
│   ├── App.css
│   └── index.js
├── build/               # Production build
├── node_modules/        # Dependencies
├── package.json         # Project metadata
├── webpack.config.js    # Webpack configuration
└── README.md           # This file
```

---

## 🔑 Environment Variables

Required environment variables (configure in `aws-credentials.txt`):
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_DEFAULT_REGION` - AWS region (default: us-east-1)

Google reCAPTCHA:
- Site key configured in `App.js`

---

## 🎨 Design Principles

- **Modern & Clean UI** - Professional interface with intuitive navigation
- **Accessibility** - WCAG compliant with keyboard navigation support
- **Responsive Design** - Works across desktop, tablet, and mobile devices
- **Performance Optimized** - Lazy loading, code splitting, and performance monitoring
- **Security First** - Multiple layers of authentication and authorization

---

## 🧪 Testing

Run tests:
```bash
npm test
```

---

## 📝 License

See EULA for end-user license agreement terms.

---

## 🤝 Support

For support and inquiries:
- **Website**: [HRRobots.com](https://hrrobots.com)
- **Demo Videos**: [YouTube Channel](https://www.youtube.com/@hrrobots)

---

## 🔄 Version History

**Version 1.0.0** - Current Release
- Complete AI-powered interview platform
- 76+ AWS Lambda functions
- Advanced proctoring system
- Comprehensive analytics
- GDPR compliant

---

## 🌟 Highlights

✅ **AI-Powered** - Intelligent automation throughout the hiring process  
✅ **Secure** - Advanced proctoring and identity verification  
✅ **Scalable** - Serverless architecture with AWS Lambda  
✅ **Comprehensive** - End-to-end hiring workflow  
✅ **User-Friendly** - Intuitive interface for recruiters and candidates  
✅ **Compliant** - GDPR and data protection standards  

---

**Made with ❤️ by the HR Robots Team**

*Transforming recruitment with artificial intelligence*
