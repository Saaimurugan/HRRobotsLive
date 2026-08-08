# HR Robots — User Guide

> **Version 2.0 · August 2026**  
> This guide covers every feature available to recruiters, hiring managers, candidates, and administrators.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [Dashboard Overview](#2-dashboard-overview)
3. [Creating a Template](#3-creating-a-template)
4. [Editing a Template](#4-editing-a-template)
5. [Cloning a Template](#5-cloning-a-template)
6. [Configuring a Template](#6-configuring-a-template)
7. [Assigning a Template](#7-assigning-a-template)
8. [Template History](#8-template-history)
9. [Generating Test Links](#9-generating-test-links)
10. [Bulk Test Creation](#10-bulk-test-creation)
11. [Candidate Apply Portal](#11-candidate-apply-portal)
12. [Viewing Results](#12-viewing-results)
13. [AI Resume Profiler](#13-ai-resume-profiler)
14. [Batch Profiler (Multiple Resumes)](#14-batch-profiler-multiple-resumes)
15. [Job Description Generator](#15-job-description-generator)
16. [Candidate Test Experience](#16-candidate-test-experience)
17. [Profile & Account Settings](#17-profile--account-settings)
18. [Admin Dashboard](#18-admin-dashboard)
19. [Admin Maintenance](#19-admin-maintenance)
20. [Session Security](#20-session-security)

---

## 1. Getting Started

### Sign Up

1. Navigate to the platform URL.
2. Click **Sign Up** and enter your name, email, and a strong password (8+ characters, uppercase, lowercase, number, and special character required).
3. Check your inbox for a verification email and click the link to activate your account.
4. On first login, a guided **Product Tour** launches automatically — it highlights key features. You can skip or replay it at any time.

### Log In

1. Go to `/login` and enter your credentials.
2. On successful login you are redirected to the **Dashboard** (`/list`).

### Session Expiry

If your session expires while using the platform, a toast notification appears ("Session Expired") and you are automatically redirected to the login page. Your previous page path is saved so you return to the same place after logging back in.

---

## 2. Dashboard Overview

**Route:** `/list`

The dashboard is your central hub for managing assessment templates and generating test links.

### Top Action Cards

| Card | What it does |
|------|-------------|
| **Create JD** | Opens the AI Job Description Generator |
| **Profiler** | Opens the single-resume AI Profiler |
| **Screening Assessment** | Opens the Create Template page |
| **Results** | Opens the Results Dashboard |

### Template Cards

Each template appears as a card showing:
- Template name and topic tags
- Question count and configured question limit
- Assigned recruiter/reviewer (if any)
- Approval status badge

### Template Card Actions (icon buttons)

| Icon | Action |
|------|--------|
| ✏️ Edit | Opens the Edit Template page |
| 🗑️ Delete | Deletes the template (confirmation required) |
| 👤 Assign | Assign to a recruiter or reviewer |
| ⚙️ Configure | Set test duration, question count, sensitivity |
| 📋 History | View the full audit trail for this template |
| ✅ Approve | Approve a template assigned for review |

### Sorting, Filtering & Search

- **Search** — filter templates by name in real time
- **Sort** — sort by Date (newest/oldest) or Name (A–Z / Z–A)
- **Filter** — show All, Own, Assigned, Recruiter, or Reviewer templates
- **Pagination** — 7 templates per page

---

## 3. Creating a Template

**Route:** `/createTemplate`

The template editor has a two-panel layout: the question list on the left and the editing tools on the right.

### Step 1 — Name Your Template

Enter a unique template name at the top. Duplicate names within your account are rejected.

### Step 2 — Add Questions

Click the **Add Question** accordion on the right panel.

#### Question Types

| Type | Description |
|------|-------------|
| **MCQ** | Multiple choice — select one correct answer from options |
| **Range** | Candidate selects a numeric value within a min–max range |
| **Range with Two Questions** | Candidate chooses which of two questions to answer, then selects a range value |
| **Elaborate Answer** | Open-ended text response (AI or manually evaluated) |
| **Code Solution** | Candidate writes code; optional expected solution for reference |

#### Adding an MCQ Question

1. Select **MCQ** from the Type dropdown.
2. Enter the question text using the rich text editor (supports bold, italic, lists, images, tables).
3. Click **+ Add Option** to add answer choices.
4. Select the radio button next to the correct answer.
5. Enter a **Topic** (e.g. "JavaScript") — used for grouping and filtering.
6. Click **Add Question**.

#### Adding a Range Question

1. Select **Range**.
2. Enter the question text.
3. Set **Min** and **Max** values.
4. Enter a correct answer value, or tick **Any selection is a correct answer**.
5. Click **Add Question**.

#### Adding Elaborate / Code Questions

1. Select **Elaborate Answer** or **Code Solution**.
2. Enter the question.
3. Optionally enter an expected answer/solution for reference during evaluation.
4. Click **Add Question**.

### Step 3 — Generate Questions with AI

Click the **Generate with AI** accordion.

1. Enter a **Topic** (e.g. "React Hooks").
2. Choose a **Difficulty Level**: Fresher · Intermediate · Advanced · Expert · Super Advanced.
3. Set how many questions to generate for each type (MCQ, Range, Elaborate, Code) — total must be 1–20.
4. Click **Generate Questions**. A skeleton loader appears while generating.
5. Questions are appended to the list when complete.

### Step 4 — Import from Job Description (optional)

Click the **Create from JD** accordion.

1. Upload a PDF job description or paste text.
2. Click **Extract Keywords** — the AI identifies key topics and suggests question counts and difficulty.
3. Adjust keyword selection and question counts per type.
4. Click **Generate Questions** — questions are added to your template.

### Step 5 — Save

- Templates require **5–60 questions**.
- Toggle **Psychometric Report** if this is a personality/aptitude assessment (disables correct-answer scoring).
- Click **Save Questions**.

### Editing a Question

Click **Edit** on any question card. The form pre-populates with the question's current values. Make changes and click **Save Edited Question**.

### Removing a Question

Click **Remove** on the question card. The question is immediately removed from the list (not saved until you click Save Questions).

### Topic Filtering

Use the topic filter chips at the top of the question list to show only questions for a specific topic. Click **All Topics** to reset.

---

## 4. Editing a Template

**Route:** `/edit/:id`

The Edit Template page is identical to Create Template, but loads your existing questions. Changes are saved as a new version and logged to the template history.

- You can add, edit, remove, and reorder questions.
- AI generation appends new questions to the existing set.
- The minimum question count is enforced based on the template's configured **Number of Questions**.

---

## 5. Cloning a Template

**Route:** `/cloneTemplates`

Use this to copy any of the platform's standard templates into your account.

1. Browse or search the template library.
2. Click **Clone Template** on any card.
3. The template is copied to your account with the name `"[Original Name] (Cloned)"`.
4. You can then edit and configure it as your own.

---

## 6. Configuring a Template

From the Dashboard, click the ⚙️ **Configure** icon on a template card.

| Setting | Description |
|---------|-------------|
| **Number of Questions** | How many questions are shown to candidates (1–60) |
| **Test Duration** | Total test time in minutes (5–180) |
| **Sensitivity Level** | Face-detection sensitivity — seconds before a violation warning is triggered (1–5) |
| **Allowed Defaults** | Number of minor violations allowed before termination (1–10) |

Click **Save** to apply.

---

## 7. Assigning a Template

From the Dashboard, click the 👤 **Assign** icon on a template card.

### Assigning to a Recruiter or Reviewer

1. Enter the assignee's email address.
2. Select their role:
   - **Recruiter** — can generate test links using this template
   - **Reviewer (Hiring Manager)** — reviews the template and approves it before use
3. Click **Assign**.

The assignee receives an email notification.

### Revoking an Assignment

If a template is already assigned, the Assign modal shows the current assignee. Click **Revoke Assignment** to remove them.

### Approving a Template

When assigned as a Reviewer, you see an ✅ **Approve** button on the template card. Clicking it:
- Records the approval in the template history
- Notifies the template owner by email
- Makes the template available for recruiters to use

---

## 8. Template History

From the Dashboard, click the 📋 **History** icon on a template card.

The history timeline shows:
- **Created** — who created the template and when
- **Assigned for Review** — who it was assigned to and in what role
- **Approved** — who approved it and any comments
- **Modified** — when questions or settings were changed
- **Assigned to Recruiter** — when a recruiter was given access

Each entry shows the performer's name and timestamp.

---

## 9. Generating Test Links

From the Dashboard, click the **Generate Test Link** button (▶ icon) on a template card.

1. A unique test link is created for a candidate.
2. A dialog shows the test URL — copy it manually or use the **Send Email** button to email it directly.
3. Entering the candidate's name and email sends them a branded invitation email with the test link.

### Candidate-Specific Test Links

For a personalized assessment tailored to an individual resume:

1. Click the **Candidate-Specific Test** icon on a template card.
2. Upload the candidate's resume PDF or paste the text.
3. The AI extracts keywords from the resume and matches them to the template's topics.
4. Review the keyword list — select which topics to include, keep, or remove.
5. Set question counts and complexity per keyword.
6. Optionally enable **Project Analysis** — generates scenario-based questions from the candidate's project experience.
7. Click **Generate Questions** then **Create Test**.
8. A new template is created and a test link is generated for this candidate.

---

## 10. Bulk Test Creation

From the Dashboard, click the **Bulk Upload** icon on a template card.

1. Download the CSV template (columns: `name`, `email`).
2. Fill in candidate names and email addresses.
3. Upload the CSV file.
4. Review validation — any errors (missing fields, invalid emails) are shown.
5. Click **Create Tests** — individual test links are generated and invitation emails sent to all candidates.

> **Limit:** A maximum of 25 active tests per account. Delete old tests from the Results page to free up slots.

---

## 11. Candidate Apply Portal

The Candidate Apply Portal lets candidates submit their resumes directly, then automatically matches them to the job and generates personalized test links.

### Setting Up (Recruiter)

From the Dashboard, click the **Candidate Apply** icon on a template card. The modal has three tabs:

#### JD Tab
1. Upload a job description PDF or paste text.
2. Set a **Match Threshold** (0–100%) — candidates below this score are automatically filtered.
3. Click **Save JD** and **Save Threshold**.

#### Share Link Tab
- Copy the apply link (e.g. `https://www.hrrobots.click/apply/[templateID]`) and share it with candidates.

#### Submissions Tab
Shows all applications with:
- Candidate name and email
- Submission date
- AI suitability score (if report generated)
- Live test status (Not Started / In Progress / Completed / Terminated) with score percentage

For each applicant you can:
- Click to expand their details
- Click **Generate Report** to run the AI profiler against the JD
- Click **View Test Result** to jump to their result

### Applying (Candidate)

Candidates visit the apply link and:
1. Enter their name and email.
2. Upload their resume PDF.
3. Submit — they receive a personalized test invitation by email.

---

## 12. Viewing Results

**Route:** `/result`

### Searching

- Type a **candidate name** in the search bar for real-time filtering.
- Paste a **test ID or test URL** for a direct lookup.

### Assessment Summary

The summary accordion shows counts for each test status (Not Started, In Progress, Completed, Terminated). Click a status badge to filter the table.

### Results Table

| Column | Description |
|--------|-------------|
| Date | Test submission timestamp |
| Candidate | Candidate name |
| Template | Template used |
| Test ID | Unique test identifier |
| Status | Current test status |
| 🗑️ | Delete this test record |

- Click any row to load the full result panel.
- **Sort** by any column (server-side sorting).
- **Export CSV** — downloads full results for all visible tests.

### Result Panel

When a result is loaded:
- **Score Gauge** — visual percentage score
- **Summary stats** — Total Questions / Attempted / Correct
- **Topic Score Table** — correct/attempted breakdown per topic
- **View Questions** — question-by-question review with your answer vs correct answer
- **Generate Analytics** — AI-generated performance insights report (printable)
- **Candidate Photos** — proctoring photos captured during the test

---

## 13. AI Resume Profiler

**Route:** `/profilerPage`

Match a single resume against a job description to produce a suitability report.

### Steps

1. Upload a **Job Description** PDF (or use the JD drag-drop zone).
2. Upload a **Resume** PDF.
3. Click **Generate Report**.
4. The report popup shows:

| Field | Description |
|-------|-------------|
| Candidate Name | Extracted from resume |
| Suitability Score | Overall match percentage |
| Matching Skills | Skills present in both JD and resume |
| Skill Gaps | Required skills missing from resume |
| Additional Strengths | Skills in resume not required by JD |
| Suggested Improvements | Recommendations for the candidate |
| Overall Assessment | AI summary recommendation |

5. Click **Generate Candidate-Specific Test** to create a personalized assessment for this candidate (opens the Candidate-Specific Test modal).

---

## 14. Batch Profiler (Multiple Resumes)

**Route:** `/profilerPageMultiple`

Screen up to 50 resumes against one job description simultaneously.

### Steps

1. Upload a **Job Description** PDF.
2. Upload **multiple Resume PDFs** (up to 50).
3. Click **Generate Reports**.
4. Progress bar shows each resume being processed.
5. Results table shows all candidates ranked by suitability score.
6. Click any row to expand the full report for that candidate.

---

## 15. Job Description Generator

**Route:** `/createJD`

Generate a professional job description from a short brief.

### Form Fields

| Field | Description |
|-------|-------------|
| Role Name | Job title (e.g. "Senior React Developer") |
| Years of Experience | Required experience range (e.g. "3–5 years") |
| Project Details | Context about the role's projects |
| Languages / Technologies | Required tech stack |
| Additional Skills | Any other requirements |

### Steps

1. Fill in the form fields.
2. Click **Generate JD**.
3. The AI produces a formatted job description.
4. Click **Print / Export** to save as PDF.

---

## 16. Candidate Test Experience

Candidates access their test via the unique test link sent by the recruiter.

### Step 1 — System Check

The candidate is prompted to grant:
- **Camera permission** — required for proctoring
- **Microphone permission** — required for audio monitoring
- **Clipboard permission** — prevents copy-paste
- **Single-screen verification** — prevents dual-monitor use

### Step 2 — Identity Verification

1. **Consent** — candidate reads and accepts the data protection notice (GDPR / India DPDP Act).
2. **Live photo** — webcam captures a photo of the candidate.
3. **ID photo** — candidate holds up a government ID for capture.

### Step 3 — Taking the Test

- Questions are displayed one at a time.
- A countdown timer is visible at all times.
- **MCQ** — select one option.
- **Range** — drag a slider to select a value.
- **Elaborate** — type a free-form answer.
- **Code** — write a code solution in the editor.
- Navigate with **Previous / Next** buttons.
- Click **Submit** when finished, or the test auto-submits when time expires.

### Proctoring Violations

| Violation | Warning |
|-----------|---------|
| Face not visible | Warning overlay shown |
| Audio detected | Warning counter incremented |
| Fullscreen exited | Warning + prompt to return |
| Window switch detected | Warning |
| Screenshot attempted | Immediate test termination |

After a configurable number of violations (set in template configuration), the test is automatically terminated and the score is calculated for answered questions.

---

## 17. Profile & Account Settings

**Route:** `/profile`

### Change Password

1. Enter your new password (must meet complexity requirements).
2. Confirm the new password.
3. Click **Update Password**.

### Invite a User

1. Enter a colleague's business email address.
2. Click **Send Invitation** — they receive a sign-up email with a direct link.

> Personal email addresses (Gmail, Yahoo, etc.) are not accepted. Business domain emails only.

### Delete Account

1. Select a reason for deletion.
2. Type `DELETE` in the confirmation field.
3. Click **Delete My Account** — this is permanent and cannot be undone.

---

## 18. Admin Dashboard

**Route:** `/admin`  
*Accessible to authorized administrators only.*

### Overview Stats

Four stat cards show:
- Total Users
- Total Templates
- Total Test Transactions
- Active Tests

### Charts

Visual breakdowns of platform activity over time.

### Activity Logs

A full log of all user actions across the platform.

**Filters available:**
- Activity type (CreateJD, ProfilerPage, Login, etc.)
- Action (form_submitted, report_generated, etc.)
- User (filter by specific email)
- Status (success / failure)
- Time period (last 7 / 30 / 90 days)

**Table columns:** User · Activity · Action · Status · Duration · Timestamp · Details

### Users Section

Expandable list of all users showing their templates and test transactions.

---

## 19. Admin Maintenance

**Route:** `/admin-cleanup`  
*Accessible to authorized administrators only.*

These tools perform **irreversible** database operations. Each requires an explicit confirmation dialog before executing.

| Operation | Impact |
|-----------|--------|
| **Delete ALL Test Transactions** | Permanently removes all test records and all associated S3 proctoring photos |
| **Delete All MCQ Answers** | Removes all stored candidate answers from the MCQAnswers table |
| **Clean Orphaned Questions** | Deletes questions referencing templates that no longer exist |
| **Delete ALL Orphaned Questions** | Comprehensive cleanup — also removes answers referencing deleted questions |
| **Clean Orphaned Test Transactions** | Removes test records referencing deleted templates |
| **Clean Orphaned Photo Records** | Removes photo metadata records where the S3 file no longer exists |

> ⚠️ These operations cannot be undone. Use them only for maintenance purposes.

---

## 20. Session Security

### Automatic Session Handling

HR Robots automatically detects authentication and authorization failures on every API call:

| HTTP Status | Message Shown | Action |
|-------------|---------------|--------|
| **401 Unauthorized** | "Session Expired — Your session has timed out. Please log in again." | Session cleared → redirect to `/login` after 1.5 seconds |
| **403 Forbidden** | "Access Denied — You do not have permission to perform this action. Please log in again." | Session cleared → redirect to `/login` after 1.5 seconds |

This happens automatically regardless of which page or feature you are using — no manual handling required.

### Returning After Login

After being redirected to login, your original page path is saved. Once you log in again, you are returned to where you were.

### JWT Security

All API requests send your JWT authentication token exclusively in the HTTP `Authorization` header. The token is never included in request bodies.

---

## Keyboard Shortcuts & Accessibility

- **Skip to main content** — a skip link appears on keyboard focus for screen reader users
- All interactive elements are keyboard navigable
- WCAG 2.1 compliance — proper ARIA labels, roles, and live regions for screen announcements
- High-contrast status indicators for test results (correct = green, incorrect = red)

---

## Troubleshooting

### "Failed to fetch template history" error
Your session may have expired. The page will redirect to login — sign back in and try again.

### Questions appear garbled after adding manually
Ensure you are using the rich text editor (CKEditor). Plain text typed outside the editor may not render correctly. Clear the field and re-enter using the editor.

### Camera not starting on candidate test
Ensure the browser has camera permission granted. In Chrome: Settings → Privacy & Security → Camera → Allow for this site.

### Test link not working
Test links are single-use per candidate. If a test is already in progress or completed, the link will show the current status. Generate a new link from the dashboard if needed.

### Bulk upload CSV errors
Ensure the CSV has exactly two columns: `name` and `email`. Remove any extra columns, blank rows, or special characters from the headers.

---

*For further support, visit [HRRobots.com](https://hrrobots.com) or open a [GitHub Issue](https://github.com/your-org/HRRobotsLive/issues).*
