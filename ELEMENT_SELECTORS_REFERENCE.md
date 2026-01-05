# HR Robots - Element Selectors & IDs Reference

## Quick Selector Reference

### Authentication Pages

#### Login Page (`/login`)
```
Email Input:              input[name="email"]
Password Input:           input[name="password"]
Show Password Toggle:     button.password-toggle
Sign In Button:           button.login-btn
Forgot Password Link:     span.forgot-link
Sign Up Link:             a[href="/signup"]
Error Message:            div.message-box.error
Success Message:          div.message-box.success
Captcha Notice:           div.captcha-notice
Loading Spinner:          svg.spinner
```

#### Signup Page (`/signup`)
```
Email Input:              input[name="email"]
Password Input:           input[name="password"]
Confirm Password Input:   input[name="confirmPassword"]
Show Password Toggle:     button.password-toggle
Create Account Button:    button.login-btn
Email Error:              span.field-error
Password Error:           span.field-error
Password Strength Bars:   div.strength-bars
Strength Bar:             div.strength-bar
Strength Label:           span.strength-label
```

#### Forgot Password Page (`/forgot-password`)
```
Email Input:              input[name="email"]
Send Reset Link Button:   button.login-btn
Try Again Button:         button.login-btn.secondary
Success State:            div.success-state
Email Display:            div.email-display
Success Icon:             svg (in success-state)
```

---

### Dashboard & Navigation

#### Header Navigation
```
Logo:                     img[src="../logo.png"]
Home Button:              button (with home icon)
Profile Button:           button (with profile icon)
Profile Popup:            div (with profile info)
Logout Button:            button (with logout icon)
```

#### Dashboard Cards (`/list`)
```
Create JD Card:           div.card (contains "Create JD")
Create JD Button:         button (in Create JD card)
Candidate Profiler Card:  div.card (contains "Candidate Profiler")
Profiler Button:          button (in Candidate Profiler card)
Screening Test Card:      div.card (contains "Screening Test")
Create Template Button:   button (in Screening Test card)
Results Card:             div.card (contains "Results")
Results Button:           button (in Results card)
Empty State:              div.empty-state
```

#### Template Cards
```
Template Card:            div.card.template-card
Template Actions:         div.card-actions
Edit Button:              button.delete-button (first)
Delete Button:            button.delete-button (second)
Assign Button:            button.delete-button (third)
Config Button:            button.delete-button (fourth)
Generate Link Button:     button (in template card)
Copy to Clipboard Button: button (in template card)
Assigned Badge:           div.assigned-badge
```

---

### Job Description Creation (`/createJD`)

#### Form Elements
```
Back Button:              button.modern-button--outline
Page Title:               h1
Role Name Input:          input[name="roleName"]
Experience Input:         input[name="yearsOfExperience"]
Project Details Textarea: textarea[name="projectDetails"]
Languages Input:          input[name="languages"]
Skills Input:             input[name="additionalSkills"]
Generate Button:          button.submit-btn
Print Button:             button.print-btn
```

#### Output
```
Generated Content:        div#printableContent
JD Content:               div.jd-content
```

---

### Candidate Profiler (`/profilerPage`)

#### File Upload
```
Back Button:              button.profiler-back-btn
Page Title:               h1
JD Upload Card:           div.upload-card (first)
JD Upload Input:          input#jd-upload
JD Upload Label:          label[for="jd-upload"]
JD File Name:             div.file-name (in JD card)
Resume Upload Card:       div.upload-card (second)
Resume Upload Input:      input#resume-upload
Resume Upload Label:      label[for="resume-upload"]
Resume File Name:         div.file-name (in Resume card)
Generate Button:          button.submit-btn
Print Button:             button.print-btn
```

#### Report Display
```
Report Section:           div.report-section
Report Card:              div.report-card
Report Body:              div.report-body
Report Table:             table.report-table
Table Row:                tr
Table Cell:               td
Suitability Badge:        span.suitability-badge
```

---

### Screening Test Creation (`/createTemplate`)

#### Form Elements
```
Back Button:              button.modern-button--outline
Template Name Input:      input (first input)
Question Type Select:     select (for type)
Question Textarea:        textarea[name="question"]
Topic Combobox:           input.topic-combobox-input
Topic Dropdown:           ul.topic-combobox-dropdown
Topic Option:             li.topic-combobox-option
Difficulty Select:        select (for level)
Option Inputs:            input (for options)
Correct Answer Select:    select (for correct answer)
Add Question Button:      button (with "Add" text)
Generate Questions Button: button (with "Generate" text)
Save Template Button:     button (with "Save" text)
```

#### Question Display
```
Question List:            div.question-list
Question Item:            div.question-item
Question Text:            div.question-text
Question Options:         div.question-options
Option Item:              div.option-item
Edit Button:              button (in question item)
Delete Button:            button (in question item)
Topic Filter:             button (for topic filtering)
Group By Topic Toggle:    input[type="checkbox"]
```

#### Modals
```
Mobile Warning Overlay:   div.mobile-warning-overlay
Mobile Warning Modal:     div.mobile-warning-modal
Modal Icon:               svg.mobile-warning-icon
Modal Message:            p (in modal)
Modal OK Button:          button.btn-primary
```

---

### Test Execution (`/test/:id`)

#### Setup Wizard
```
Wizard Container:         div (main wizard)
Step Indicator:           div (step progress)
Step Title:               h2
Step Content:             div (step content)

Step 1 - System Check:
  Camera Permission:      div (permission status)
  Mic Permission:         div (permission status)
  Clipboard Permission:   div (permission status)
  Single Screen Check:    div (permission status)

Step 2 - Guidelines:
  Guidelines Checkbox:    input[type="checkbox"]
  Candidate Name Input:   input (for name)
  Next Button:            button (with "Next" text)

Step 3 - Consent:
  Consent Scroll Area:    div.consent-scroll
  Consent Text:           div (consent content)
  Consent Checkbox:       input[type="checkbox"]
  Next Button:            button (with "Next" text)

Step 4 - Identity:
  Video Element:          video
  Canvas Element:         canvas
  Capture Photo Button:   button (with "Capture" text)
  Capture ID Button:      button (with "Capture" text)
  Start Test Button:      button (with "Start" text)
```

#### Test Interface
```
Question Text:            div.question-text
Question Options:         div.question-options
Option Button:            button.option-button
Previous Button:          button (with "Previous" text)
Next Button:              button (with "Next" text)
Submit Button:            button (with "Submit" text)
Timer:                    div.timer
Progress:                 div.progress
Question Counter:         span (showing "X / Y")
```

#### Proctoring
```
Fullscreen Warning:       div.proctor-warning
Face Warning:             div.face-warning
Multiple Faces Warning:   div.multiple-faces-warning
Warning Message:          p (in warning)
Warning Close Button:     button (in warning)
```

---

### Results Page (`/result`)

#### Search
```
Test Link Input:          input (for test link)
Search Button:            button (with "Search" text)
```

#### Results Display
```
Results Container:        div.results-container
Score Display:            div.score-display
Score Value:              span (score number)
Question Review:          div.question-review
Question Item:            div.question-item
Candidate Answer:         div.candidate-answer
Correct Answer:           div.correct-answer
Print Button:             button (with "Print" text)
Export Button:            button (with "Export" text)
```

---

### User Profile (`/profile`)

#### Password Change
```
Back Button:              button.profile-back-btn
Page Title:               h1
Password Section:         div.password-section
New Password Input:       input[type="password"] (first)
Confirm Password Input:   input[type="password"] (second)
Show Password Button:     button.password-toggle-btn
Update Password Button:   button.save-btn (first)
Password Error:           p.password-error
```

#### Invite User
```
Invite Section:           div.config-card
Invite Email Input:       input[type="email"]
Send Invitation Button:   button.save-btn (second)
```

#### Configuration Sections
```
Config Card:              div.config-card
Config Card Header:       div.config-card-header
Config Card Icon:         svg (in header)
Config Card Title:        h3
Config Form:              div.config-form
Form Group:               div.config-form-group
Form Label:               label
Form Input:               input or select
Save Button:              button.save-btn
```

---

### Common Components

#### Toast Notifications
```
Toast Container:          div.toast-container
Toast Message:            div.toast
Toast Error:              div.toast.error
Toast Success:            div.toast.success
Toast Warning:            div.toast.warning
Toast Info:               div.toast.info
Toast Icon:               svg.toast-icon
Toast Content:            div.toast-content
Toast Title:              div.toast-title
Toast Message:            div.toast-message
Toast Close Button:       button.toast-close
Toast Exiting:            div.toast.toast-exit
```

#### Modals
```
Modal Overlay:            div.modal-overlay
Modal Content:            div.modal
Modal Header:             div.modal-header
Modal Body:               div.modal-body
Modal Footer:             div.modal-footer
Modal Close Button:       button (with close icon)
Modal Confirm Button:     button (with "Confirm" text)
Modal Cancel Button:      button (with "Cancel" text)
```

#### Forms
```
Form Group:               div.form-group
Form Label:               label
Form Input:               input or textarea
Form Select:              select
Form Error:               span.field-error
Form Success:             div.message-box.success
Form Loading:             svg.spinner
```

#### Buttons
```
Primary Button:           button.login-btn or button.submit-btn
Secondary Button:         button.modern-button--outline
Danger Button:            button.delete-button
Icon Button:              button (with svg icon)
Disabled Button:          button[disabled]
Loading Button:           button (with spinner)
```

---

## XPath Selectors (Alternative)

### Login Page
```
Email Input:              //input[@name="email"]
Password Input:           //input[@name="password"]
Sign In Button:           //button[contains(@class, "login-btn")]
Forgot Password Link:     //span[contains(@class, "forgot-link")]
Error Message:            //div[contains(@class, "message-box") and contains(@class, "error")]
```

### Signup Page
```
Email Input:              //input[@name="email"]
Password Input:           //input[@name="password"]
Confirm Password:         //input[@name="confirmPassword"]
Create Account Button:    //button[contains(@class, "login-btn")]
Email Error:              //span[contains(@class, "field-error")]
```

### Dashboard
```
Create JD Button:         //button[contains(., "Create JD")]
Profiler Button:          //button[contains(., "Profile")]
Create Template Button:   //button[contains(., "Create Template")]
Results Button:           //button[contains(., "Check Results")]
```

### Template Cards
```
Template Card:            //div[contains(@class, "template-card")]
Edit Button:              //button[contains(@class, "delete-button")][1]
Delete Button:            //button[contains(@class, "delete-button")][2]
Assign Button:            //button[contains(@class, "delete-button")][3]
Config Button:            //button[contains(@class, "delete-button")][4]
```

### Test Page
```
Question Text:            //div[contains(@class, "question-text")]
Option Button:            //button[contains(@class, "option-button")]
Previous Button:          //button[contains(., "Previous")]
Next Button:              //button[contains(., "Next")]
Submit Button:            //button[contains(., "Submit")]
```

---

## CSS Selector Patterns

### By Class
```
.login-btn              - Primary button
.submit-btn             - Submit button
.delete-button          - Delete/action button
.modern-button--outline - Secondary button
.toast                  - Toast notification
.message-box            - Message container
.form-group             - Form field group
.input-group            - Input wrapper
.card                   - Card component
.modal                  - Modal dialog
```

### By Attribute
```
input[name="email"]     - Email input
input[type="password"]  - Password input
input[type="checkbox"]  - Checkbox
input[type="file"]      - File input
button[disabled]        - Disabled button
a[href="/login"]        - Link to login
```

### By Combination
```
div.card.template-card  - Template card
button.login-btn:not([disabled]) - Enabled login button
input[type="text"][name="email"] - Email text input
div.toast.success       - Success toast
```

---

## Dynamic Element Selectors

### Elements with Dynamic Content
```
// Toast with specific message
//div[contains(@class, "toast") and contains(., "Success")]

// Button with specific text
//button[contains(., "Generate")]

// Input with placeholder
//input[@placeholder="Enter your email"]

// Card with specific title
//div[contains(@class, "card") and contains(., "Create JD")]

// Table cell with specific content
//td[contains(., "Candidate Name")]
```

---

## Waiting Strategies

### Wait for Element Presence
```python
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By

wait = WebDriverWait(driver, 10)
element = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "button.login-btn")))
```

### Wait for Element Visibility
```python
element = wait.until(EC.visibility_of_element_located((By.CSS_SELECTOR, "div.message-box")))
```

### Wait for Element Clickability
```python
element = wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, "button.login-btn")))
```

### Wait for URL Change
```python
wait.until(EC.url_contains("/list"))
```

### Wait for Text in Element
```python
wait.until(EC.text_to_be_present_in_element((By.CSS_SELECTOR, "div.message-box"), "Success"))
```

---

## Element Interaction Examples

### Click Element
```python
element = driver.find_element(By.CSS_SELECTOR, "button.login-btn")
element.click()
```

### Send Keys
```python
element = driver.find_element(By.NAME, "email")
element.send_keys("test@company.com")
```

### Clear and Send Keys
```python
element = driver.find_element(By.NAME, "email")
element.clear()
element.send_keys("test@company.com")
```

### Get Text
```python
element = driver.find_element(By.CSS_SELECTOR, "div.message-box")
text = element.text
```

### Get Attribute
```python
element = driver.find_element(By.NAME, "email")
value = element.get_attribute("value")
```

### Check if Displayed
```python
element = driver.find_element(By.CSS_SELECTOR, "button.login-btn")
is_displayed = element.is_displayed()
```

### Check if Enabled
```python
element = driver.find_element(By.CSS_SELECTOR, "button.login-btn")
is_enabled = element.is_enabled()
```

### Get Multiple Elements
```python
elements = driver.find_elements(By.CSS_SELECTOR, "button.option-button")
for element in elements:
    element.click()
```

---

## Form Interaction Patterns

### Fill Text Input
```python
input_field = driver.find_element(By.NAME, "email")
input_field.send_keys("test@company.com")
```

### Select Dropdown Option
```python
select = Select(driver.find_element(By.NAME, "level"))
select.select_by_value("intermediate")
# or
select.select_by_visible_text("Intermediate")
```

### Check Checkbox
```python
checkbox = driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
if not checkbox.is_selected():
    checkbox.click()
```

### Upload File
```python
file_input = driver.find_element(By.ID, "jd-upload")
file_input.send_keys("/path/to/file.pdf")
```

### Submit Form
```python
form = driver.find_element(By.CSS_SELECTOR, "form")
form.submit()
# or
submit_button = driver.find_element(By.CSS_SELECTOR, "button[type='submit']")
submit_button.click()
```

---

## Scroll and Navigation

### Scroll to Element
```python
element = driver.find_element(By.CSS_SELECTOR, "button.login-btn")
driver.execute_script("arguments[0].scrollIntoView(true);", element)
```

### Scroll to Bottom
```python
driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
```

### Scroll Element to Bottom
```python
element = driver.find_element(By.CSS_SELECTOR, "div.consent-scroll")
driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", element)
```

### Navigate to URL
```python
driver.get("https://www.hrrobots.click/login")
```

### Get Current URL
```python
current_url = driver.current_url
```

### Go Back
```python
driver.back()
```

### Go Forward
```python
driver.forward()
```

---

## JavaScript Execution

### Get Element Value
```python
value = driver.execute_script("return document.querySelector('input[name=\"email\"]').value;")
```

### Set Element Value
```python
driver.execute_script("document.querySelector('input[name=\"email\"]').value = 'test@company.com';")
```

### Click Element
```python
element = driver.find_element(By.CSS_SELECTOR, "button.login-btn")
driver.execute_script("arguments[0].click();", element)
```

### Get Element Text
```python
text = driver.execute_script("return document.querySelector('div.message-box').textContent;")
```

### Check Element Visibility
```python
is_visible = driver.execute_script("return document.querySelector('button.login-btn').offsetParent !== null;")
```

