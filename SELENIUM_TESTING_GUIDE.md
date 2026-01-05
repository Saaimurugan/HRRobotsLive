# HR Robots - Selenium Testing Guide

## Application Overview
HR Robots is a React-based application for AI-powered recruitment and candidate screening. It uses React Router for navigation and includes features for test creation, candidate profiling, and interview management.

### Technology Stack
- **Framework**: React 19.0.0
- **Routing**: React Router DOM 7.0.2
- **Security**: Google reCAPTCHA v3
- **PDF Processing**: pdfjs-dist 2.16.105
- **API**: AWS Lambda endpoints

### Base URLs
- **Frontend**: https://www.hrrobots.click
- **API Endpoints**: 
  - Auth: https://7ryecn2i2k.execute-api.us-east-1.amazonaws.com/dev/
  - Tests: https://1p3uymdf7g.execute-api.us-east-1.amazonaws.com/dev/
  - Email: https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/

---

## 1. AUTHENTICATION FLOWS

### 1.1 Login Flow
**Route**: `/login`
**Component**: `src/components/login.js`

#### Form Elements
| Element | Type | Selector | Required |
|---------|------|----------|----------|
| Email Input | text | `input[name="email"]` | Yes |
| Password Input | password | `input[name="password"]` | Yes |
| Show Password Toggle | button | `.password-toggle` | No |
| Sign In Button | button | `.login-btn` | Yes |
| Forgot Password Link | link | `.forgot-link` | No |
| Sign Up Link | link | `a[href="/signup"]` | No |

#### Key Features
- **reCAPTCHA v3**: Automatically triggered after 3 failed login attempts
- **Failed Attempts Tracking**: Stored in sessionStorage with key `loginFailedAttempts`
- **Session Management**: JWT token stored in global context
- **Email Validation**: Standard email format validation
- **Error Messages**: Displayed in `.message-box` with class `error` or `success`

#### Test Scenarios
1. Valid login with correct credentials
2. Invalid login with wrong password (triggers failed attempt counter)
3. Login after 3 failed attempts (reCAPTCHA verification)
4. Email not verified error (statusCode 403)
5. Forgot password flow from login page

#### Selectors for Automation
```
Email field: input[type="email"][name="email"]
Password field: input[type="password"][name="password"]
Login button: button.login-btn
Error message: div.message-box.error
Success message: div.message-box.success
Forgot password link: span.forgot-link
```

---

### 1.2 Signup Flow
**Route**: `/signup`
**Component**: `src/components/signup.js`

#### Form Elements
| Element | Type | Selector | Validation |
|---------|------|----------|-----------|
| Work Email | email | `input[name="email"]` | Must be business email (not personal) |
| Password | password | `input[name="password"]` | Min 8 chars, uppercase, lowercase, number, special char |
| Confirm Password | password | `input[name="confirmPassword"]` | Must match password |
| Show Password Toggle | button | `.password-toggle` | N/A |
| Create Account Button | button | `.login-btn` | Disabled if validation fails |

#### Validation Rules
- **Email**: 
  - Must be valid email format
  - Cannot be personal email (gmail.com, yahoo.com, hotmail.com, outlook.com, etc.)
  - Must not already exist in system
- **Password**:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (@$!%*?&)
- **Password Strength Indicator**: Shows visual feedback with 5 levels

#### Error Handling
- Email already registered: "Email is already registered. Please use a different email."
- Invalid email format: "Invalid email format"
- Personal email: "Personal emails are not allowed. Please use an official email."
- Password mismatch: "Passwords do not match"
- Weak password: "Password must be at least 8 characters..."

#### Test Scenarios
1. Valid signup with business email
2. Signup with personal email (should fail)
3. Signup with existing email (should fail)
4. Weak password validation
5. Password mismatch validation
6. Successful signup redirects to `/signup-success`

#### Selectors for Automation
```
Email field: input[type="email"][name="email"]
Password field: input[type="password"][name="password"]
Confirm password field: input[type="password"][name="confirmPassword"]
Create account button: button.login-btn
Email error: span.field-error
Password strength bars: div.strength-bars
```

---

### 1.3 Forgot Password Flow
**Route**: `/forgot-password`
**Component**: `src/components/forgotPassword.js`

#### Form Elements
| Element | Type | Selector |
|---------|------|----------|
| Email Input | email | `input[name="email"]` |
| Send Reset Link Button | button | `.login-btn` |
| Try Again Button | button | `.login-btn.secondary` |

#### Flow States
1. **Initial State**: Email input form
2. **Success State**: "Check Your Email" message with email display
3. **Error State**: Error message displayed

#### API Endpoint
- **POST**: `/forgotPassword`
- **Body**: `{ recipient_email: string }`
- **Response**: `{ statusCode: 200, body: { message: string } }`

#### Test Scenarios
1. Valid email sends reset link
2. Invalid email shows error
3. Success state displays correct email
4. "Try Again" button resets form
5. Back to Sign In link works

#### Selectors for Automation
```
Email input: input[type="email"][name="email"]
Send button: button.login-btn
Success message: div.success-state
Email display: div.email-display
Try again button: button.login-btn.secondary
```

---

## 2. MAIN DASHBOARD & NAVIGATION

### 2.1 Dashboard Routes
**Route**: `/list`
**Component**: `src/components/createTest.js`

#### Main Cards (Dashboard Options)
| Card | Route | Purpose |
|------|-------|---------|
| Create JD | `/createJD` | Generate job descriptions |
| Candidate Profiler | `/profilerPage` | Upload resume & JD for matching |
| Screening Test | `/createTemplate` | Create MCQ templates |
| Results | `/result` | View test results |

#### Header Navigation
- **Home Icon**: Navigate to `/list`
- **Profile Icon**: Navigate to `/profile` (shows logged-in user on hover)
- **Logout Icon**: Navigate to `/logout`

#### Selectors for Automation
```
Create JD button: button (in card with "Create JD" text)
Candidate Profiler button: button (in card with "Candidate Profiler" text)
Screening Test button: button (in card with "Screening Test" text)
Results button: button (in card with "Results" text)
Home icon: button svg (in header)
Profile icon: button svg (in header)
Logout icon: button svg (in header)
```

---

## 3. JOB DESCRIPTION (JD) CREATION

### 3.1 Create JD Flow
**Route**: `/createJD`
**Component**: `src/components/createJD.js`

#### Form Fields
| Field | Type | Selector | Required |
|-------|------|----------|----------|
| Role Name | text | `input[name="roleName"]` | Yes |
| Years of Experience | number | `input[name="yearsOfExperience"]` | Yes |
| Project Details | textarea | `textarea[name="projectDetails"]` | No |
| Programming Languages | text | `input[name="languages"]` | Yes |
| Additional Skills | text | `input[name="additionalSkills"]` | Yes |
| Generate Button | button | `.submit-btn` | N/A |

#### Input Constraints
- **Years of Experience**: Min 0, Max 40, Step 0.1
- **Role Name**: Text input (e.g., "Senior Software Engineer")
- **Languages**: Comma-separated (e.g., "JavaScript, Python, Java")
- **Skills**: Comma-separated (e.g., "AWS, Docker, Agile")

#### Output
- Generated HTML job description
- Print button to print/save as PDF
- Back button to return to dashboard

#### Test Scenarios
1. Fill all required fields and generate JD
2. Verify generated JD displays correctly
3. Print JD functionality
4. Back button navigation
5. Loading state during generation

#### Selectors for Automation
```
Role name input: input[name="roleName"]
Experience input: input[name="yearsOfExperience"]
Languages input: input[name="languages"]
Skills input: input[name="additionalSkills"]
Generate button: button.submit-btn
Print button: button.print-btn
Back button: button.modern-button--outline
Generated content: div#printableContent
```

---

## 4. CANDIDATE PROFILER

### 4.1 Candidate Profiling Flow
**Route**: `/profilerPage`
**Component**: `src/components/profilerPage.js`

#### File Upload Elements
| Element | Type | Selector | Accepts |
|---------|------|----------|---------|
| JD Upload | file | `input#jd-upload` | PDF only |
| Resume Upload | file | `input#resume-upload` | PDF only |
| Generate Report Button | button | `.submit-btn` | N/A |

#### Report Output
- Candidate Name
- Summary
- Suitability Score (badge)
- Key Matching Skills (list)
- Gaps in Skills/Experience (list)
- Additional Strengths (list)
- Suggested Improvements (list)
- Conclusion

#### API Endpoint
- **POST**: `/matchJDResume`
- **Body**: `{ jobDescription: string, resume: string, token: string }`
- **Response**: `{ statusCode: 200, body: { data: { ... } } }`

#### Test Scenarios
1. Upload valid PDF files
2. Generate suitability report
3. Verify report displays all sections
4. Print report functionality
5. Error handling for invalid files
6. Back button navigation

#### Selectors for Automation
```
JD upload input: input#jd-upload
Resume upload input: input#resume-upload
JD upload label: label[for="jd-upload"]
Resume upload label: label[for="resume-upload"]
Generate button: button.submit-btn
Print button: button.print-btn
Report section: div.report-section
Report table: table.report-table
Suitability badge: span.suitability-badge
```

---

## 5. SCREENING TEST CREATION

### 5.1 Create Template Flow
**Route**: `/createTemplate`
**Component**: `src/components/createTemplate.js`

#### Form Elements
| Element | Type | Selector | Purpose |
|---------|------|----------|---------|
| Template Name | text | `input` (for template name) | Name the test template |
| Question Type | select | `select` | MCQ (default) |
| Question Text | textarea | `textarea` (for question) | Enter question with optional topic |
| Topic | combobox | `.topic-combobox-input` | Select or create topic |
| Difficulty Level | select | `select` (for level) | fresher, intermediate, expert |
| Options | text inputs | `input` (for options) | 4 options for MCQ |
| Correct Answer | select | `select` (for correct answer) | Select correct option |
| Add Question Button | button | `button` (add question) | Add to question set |
| Generate Questions Button | button | `button` (generate) | AI-generate questions |
| Save Template Button | button | `button` (save) | Save template to backend |

#### Question Format
- Questions can include topic prefix: `Topic::: Question text`
- Topic is optional but helps organize questions
- Supports multiple topics within one template

#### Test Scenarios
1. Create template with manual questions
2. Add multiple questions with different topics
3. Generate questions using AI
4. Edit existing questions
5. Delete questions
6. Save template
7. Group questions by topic
8. Filter questions by topic

#### Selectors for Automation
```
Template name input: input (first input in form)
Question textarea: textarea[name="question"]
Topic combobox: input.topic-combobox-input
Difficulty select: select (for level)
Option inputs: input (for options)
Correct answer select: select (for correct answer)
Add question button: button (with "Add" text)
Generate button: button (with "Generate" text)
Save button: button (with "Save" text)
Question list: div.question-list
Question item: div.question-item
```

---

### 5.2 Edit Template Flow
**Route**: `/edit/:id`
**Component**: `src/components/editTemplate.js`

#### Similar to Create Template
- Load existing questions
- Edit/delete questions
- Add new questions
- Save changes

#### Additional Features
- Configuration modal for test settings
- Number of questions setting
- Test duration setting
- Face recognition toggle
- Tolerance level setting

#### Selectors for Automation
```
Config button: button (with settings icon)
Config modal: div.config-modal
Number of questions input: input[name="numberOfQuestions"]
Test duration input: input[name="testDuration"]
Face recognition toggle: input[type="checkbox"]
Save config button: button (in config modal)
```

---

## 6. TEST EXECUTION

### 6.1 Test Page Flow
**Route**: `/test/:id`
**Component**: `src/components/testPage.js`

#### Setup Wizard Steps
1. **System Check**: Verify camera, mic, clipboard permissions
2. **Test Guidelines**: Accept guidelines
3. **Data Consent**: Accept data consent (must scroll to bottom)
4. **Identity Verification**: Capture photo and ID card

#### Form Elements
| Element | Type | Selector | Purpose |
|---------|------|----------|---------|
| Candidate Name | text | `input` (in wizard) | Enter candidate name |
| Guidelines Checkbox | checkbox | `input[type="checkbox"]` | Accept guidelines |
| Consent Checkbox | checkbox | `input[type="checkbox"]` | Accept consent |
| Consent Scroll Area | div | `.consent-scroll` | Must scroll to enable button |
| Camera Capture Button | button | `button` (capture photo) | Take candidate photo |
| ID Capture Button | button | `button` (capture ID) | Take ID card photo |
| Start Test Button | button | `button` (start test) | Begin test |

#### Test Interface
- **Question Display**: Current question with options
- **Timer**: Test duration countdown
- **Progress**: Current question / Total questions
- **Navigation**: Previous/Next buttons
- **Submit Button**: Submit test when complete

#### Proctoring Features
- Fullscreen enforcement
- Face detection monitoring
- Clipboard monitoring
- Screen switching detection
- Audio detection

#### Test Scenarios
1. Complete setup wizard
2. Answer all questions
3. Navigate between questions
4. Submit test
5. Verify test completion
6. Handle proctoring violations

#### Selectors for Automation
```
Candidate name input: input (in wizard)
Guidelines checkbox: input[type="checkbox"] (first)
Consent checkbox: input[type="checkbox"] (second)
Consent scroll area: div.consent-scroll
Camera capture button: button (with camera icon)
ID capture button: button (with ID icon)
Start test button: button (with "Start" text)
Question text: div.question-text
Option buttons: button.option-button
Previous button: button (with "Previous" text)
Next button: button (with "Next" text)
Submit button: button (with "Submit" text)
Timer: div.timer
Progress: div.progress
```

---

## 7. RESULTS & REPORTS

### 7.1 Results Page
**Route**: `/result`
**Component**: `src/components/searchResult.js`

#### Search Elements
| Element | Type | Selector | Purpose |
|---------|------|----------|---------|
| Test Link Input | text | `input` (for test link) | Paste test link |
| Search Button | button | `button` (search) | Fetch results |

#### Results Display
- Candidate name
- Test score
- Answers review
- Question-wise analysis
- Time spent per question
- Print/Export options

#### Test Scenarios
1. Search for test results
2. View detailed results
3. Print results
4. Export results

#### Selectors for Automation
```
Test link input: input (for test link)
Search button: button (with "Search" text)
Results container: div.results-container
Score display: div.score-display
Question review: div.question-review
Print button: button (with "Print" text)
```

---

## 8. USER PROFILE

### 8.1 Profile Settings
**Route**: `/profile`
**Component**: `src/components/profile.js`

#### Form Elements
| Element | Type | Selector | Purpose |
|---------|------|----------|---------|
| New Password | password | `input[type="password"]` (first) | Enter new password |
| Confirm Password | password | `input[type="password"]` (second) | Confirm new password |
| Show Password Toggle | button | `.password-toggle-btn` | Toggle password visibility |
| Update Password Button | button | `.save-btn` | Save new password |
| Invite Email | email | `input[type="email"]` | Email to invite |
| Send Invitation Button | button | `.save-btn` | Send invitation |

#### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

#### Test Scenarios
1. Change password successfully
2. Password validation errors
3. Invite user via email
4. Verify invitation email sent
5. Error handling for invalid emails

#### Selectors for Automation
```
New password input: input[type="password"] (first)
Confirm password input: input[type="password"] (second)
Show password button: button.password-toggle-btn
Update password button: button.save-btn (first)
Invite email input: input[type="email"]
Send invitation button: button.save-btn (second)
Error message: p.password-error
Success message: div.profile-message.success
```

---

## 9. COMMON SELECTORS & PATTERNS

### Toast Notifications
```
Toast container: div.toast-container
Toast message: div.toast
Toast type (error/success/warning/info): div.toast.{type}
Toast close button: button.toast-close
```

### Buttons
```
Primary button: button.login-btn or button.submit-btn
Secondary button: button.modern-button--outline
Danger button: button.delete-button
```

### Forms
```
Form group: div.form-group
Input field: input or textarea
Label: label
Error message: span.field-error or div.message-box.error
Success message: div.message-box.success
```

### Modals
```
Modal overlay: div.modal-overlay or div.mobile-warning-overlay
Modal content: div.modal or div.mobile-warning-modal
Modal close button: button (with close icon)
```

---

## 10. GLOBAL CONTEXT & STATE MANAGEMENT

### Global Context Values
- `globalValue`: Current logged-in user email
- `JWTValue`: Authentication token
- `setGlobalValue()`: Set user email
- `setJWTValue()`: Set auth token
- `logout()`: Clear session
- `getAndClearRedirectPath()`: Get redirect path after login

### Session Storage Keys
- `loginFailedAttempts`: Number of failed login attempts
- JWT token stored in global context (not localStorage)

---

## 11. ERROR HANDLING & EDGE CASES

### Common Error Scenarios
1. **Unauthorized (401)**: Session expired, redirect to login
2. **Email Already Registered**: Show error message
3. **Invalid File Format**: Show error for non-PDF files
4. **Network Error**: Show error toast
5. **Validation Errors**: Show field-specific errors

### Retry Logic
- Failed API calls show error toast
- User can retry manually
- Some operations have automatic retry (e.g., photo capture)

---

## 12. TESTING BEST PRACTICES

### Setup
1. Clear browser cache and cookies before each test
2. Use incognito/private mode for clean sessions
3. Set appropriate wait times for API responses (5-10 seconds)

### Waits
- Explicit waits for API responses
- Implicit waits for element visibility
- Wait for loading spinners to disappear

### Data
- Use unique test emails for signup tests
- Create test templates before running test execution tests
- Clean up test data after test runs

### Assertions
- Verify page URL after navigation
- Check for success/error messages
- Validate form field values
- Verify API response status codes

---

## 13. QUICK REFERENCE - KEY ROUTES

| Route | Component | Purpose |
|-------|-----------|---------|
| `/login` | login.js | User login |
| `/signup` | signup.js | User registration |
| `/forgot-password` | forgotPassword.js | Password reset |
| `/verify-email` | verifyEmail.js | Email verification |
| `/signup-success` | signupSuccess.js | Signup confirmation |
| `/list` | createTest.js | Dashboard |
| `/createJD` | createJD.js | Create job description |
| `/profilerPage` | profilerPage.js | Candidate profiler |
| `/createTemplate` | createTemplate.js | Create test template |
| `/edit/:id` | editTemplate.js | Edit test template |
| `/test/:id` | testPage.js | Take test |
| `/result` | searchResult.js | View results |
| `/profile` | profile.js | User profile settings |
| `/logout` | App.js | Logout handler |

---

## 14. AUTHENTICATION HEADERS

All API requests (except login/signup) require:
```
Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer {JWTValue}" (if required)
}
Body: {
  ...data,
  token: JWTValue
}
```

---

## 15. IMPORTANT NOTES FOR SELENIUM TESTS

1. **reCAPTCHA**: Tests may need to handle reCAPTCHA v3 verification
2. **File Uploads**: Use proper file handling for PDF uploads
3. **Fullscreen**: Test page requires fullscreen mode
4. **Permissions**: Camera and microphone permissions needed for test execution
5. **Timing**: Some operations are async, use proper waits
6. **Session**: JWT token expires, implement re-login logic if needed
7. **Responsive**: Some features disabled on mobile (warning modal shown)

