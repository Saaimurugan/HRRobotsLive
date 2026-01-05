# HR Robots - Selenium Test Scenarios & Code Examples

## Test Scenario 1: Complete User Registration & Login Flow

### Scenario: New user signs up and logs in
```python
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

class TestUserAuthentication:
    def setup_method(self):
        self.driver = webdriver.Chrome()
        self.driver.get("https://www.hrrobots.click/signup")
        self.wait = WebDriverWait(self.driver, 10)
    
    def test_signup_with_valid_business_email(self):
        # Fill signup form
        email_input = self.wait.until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.send_keys("testuser@company.com")
        
        password_input = self.driver.find_element(By.NAME, "password")
        password_input.send_keys("TestPassword123!")
        
        confirm_password = self.driver.find_element(By.NAME, "confirmPassword")
        confirm_password.send_keys("TestPassword123!")
        
        # Submit form
        create_btn = self.driver.find_element(By.CSS_SELECTOR, "button.login-btn")
        create_btn.click()
        
        # Wait for success page
        success_message = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.success-state"))
        )
        assert success_message.is_displayed()
    
    def test_signup_rejects_personal_email(self):
        email_input = self.wait.until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.send_keys("testuser@gmail.com")
        
        # Check for error message
        error_msg = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "span.field-error"))
        )
        assert "Personal emails are not allowed" in error_msg.text
    
    def test_login_with_valid_credentials(self):
        self.driver.get("https://www.hrrobots.click/login")
        
        email_input = self.wait.until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.send_keys("testuser@company.com")
        
        password_input = self.driver.find_element(By.NAME, "password")
        password_input.send_keys("TestPassword123!")
        
        login_btn = self.driver.find_element(By.CSS_SELECTOR, "button.login-btn")
        login_btn.click()
        
        # Wait for redirect to dashboard
        self.wait.until(EC.url_contains("/list"))
        assert "/list" in self.driver.current_url
    
    def teardown_method(self):
        self.driver.quit()
```

---

## Test Scenario 2: Create Job Description

### Scenario: User creates a job description
```python
def test_create_job_description(self):
    self.driver.get("https://www.hrrobots.click/createJD")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Fill form fields
    role_name = self.wait.until(
        EC.presence_of_element_located((By.NAME, "roleName"))
    )
    role_name.send_keys("Senior Software Engineer")
    
    experience = self.driver.find_element(By.NAME, "yearsOfExperience")
    experience.send_keys("5")
    
    languages = self.driver.find_element(By.NAME, "languages")
    languages.send_keys("JavaScript, Python, Java")
    
    skills = self.driver.find_element(By.NAME, "additionalSkills")
    skills.send_keys("AWS, Docker, Agile")
    
    # Submit form
    generate_btn = self.driver.find_element(By.CSS_SELECTOR, "button.submit-btn")
    generate_btn.click()
    
    # Wait for generated content
    generated_content = self.wait.until(
        EC.presence_of_element_located((By.ID, "printableContent"))
    )
    assert generated_content.is_displayed()
    
    # Verify print button appears
    print_btn = self.driver.find_element(By.CSS_SELECTOR, "button.print-btn")
    assert print_btn.is_displayed()
```

---

## Test Scenario 3: Create Screening Test Template

### Scenario: User creates a test template with questions
```python
def test_create_screening_template(self):
    self.driver.get("https://www.hrrobots.click/createTemplate")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Enter template name
    template_name = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input"))
    )
    template_name.send_keys("Python Basics Test")
    
    # Add first question
    question_textarea = self.driver.find_element(By.CSS_SELECTOR, "textarea")
    question_textarea.send_keys("Python::: What is the output of print(2 ** 3)?")
    
    # Select topic
    topic_input = self.driver.find_element(By.CSS_SELECTOR, ".topic-combobox-input")
    topic_input.send_keys("Python")
    
    # Add options
    option_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[placeholder*='Option']")
    options = ["8", "6", "9", "3"]
    for i, option in enumerate(options):
        option_inputs[i].send_keys(option)
    
    # Select correct answer
    correct_answer_select = self.driver.find_element(By.CSS_SELECTOR, "select")
    correct_answer_select.send_keys("8")
    
    # Add question
    add_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Add')")
    add_btn.click()
    
    # Verify question added
    question_item = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.question-item"))
    )
    assert question_item.is_displayed()
    
    # Save template
    save_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Save')")
    save_btn.click()
    
    # Verify success
    success_toast = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.toast.success"))
    )
    assert "saved" in success_toast.text.lower()
```

---

## Test Scenario 4: Candidate Profiler - Resume Matching

### Scenario: User uploads resume and JD for matching
```python
def test_candidate_profiler(self):
    self.driver.get("https://www.hrrobots.click/profilerPage")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Upload JD PDF
    jd_upload = self.wait.until(
        EC.presence_of_element_located((By.ID, "jd-upload"))
    )
    jd_upload.send_keys("/path/to/job_description.pdf")
    
    # Wait for file to be processed
    time.sleep(2)
    
    # Upload Resume PDF
    resume_upload = self.driver.find_element(By.ID, "resume-upload")
    resume_upload.send_keys("/path/to/resume.pdf")
    
    # Wait for file to be processed
    time.sleep(2)
    
    # Generate report
    generate_btn = self.driver.find_element(By.CSS_SELECTOR, "button.submit-btn")
    generate_btn.click()
    
    # Wait for report
    report_section = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.report-section"))
    )
    assert report_section.is_displayed()
    
    # Verify report contains expected sections
    report_table = self.driver.find_element(By.CSS_SELECTOR, "table.report-table")
    assert "Candidate Name" in report_table.text
    assert "Suitability" in report_table.text
    assert "Matching Skills" in report_table.text
```

---

## Test Scenario 5: Test Execution - Setup Wizard

### Scenario: Candidate goes through test setup wizard
```python
def test_setup_wizard_flow(self):
    # Navigate to test
    test_id = "test-uuid-12345"
    self.driver.get(f"https://www.hrrobots.click/test/{test_id}")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Step 1: System Check
    # Verify permissions are checked
    system_check_text = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div"))
    )
    
    # Click next to proceed
    next_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Next')")
    next_btn.click()
    
    # Step 2: Test Guidelines
    # Accept guidelines
    guidelines_checkbox = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='checkbox']"))
    )
    guidelines_checkbox.click()
    
    # Enter candidate name
    name_input = self.driver.find_element(By.CSS_SELECTOR, "input[placeholder*='Name']")
    name_input.send_keys("John Doe")
    
    next_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Next')")
    next_btn.click()
    
    # Step 3: Data Consent
    # Scroll to bottom of consent
    consent_scroll = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.consent-scroll"))
    )
    self.driver.execute_script(
        "arguments[0].scrollTop = arguments[0].scrollHeight",
        consent_scroll
    )
    
    # Accept consent
    consent_checkbox = self.driver.find_element(By.CSS_SELECTOR, "input[type='checkbox']")
    consent_checkbox.click()
    
    next_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Next')")
    next_btn.click()
    
    # Step 4: Identity Verification
    # Capture photo
    capture_photo_btn = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button:contains('Capture')")
    )
    capture_photo_btn.click()
    
    # Capture ID
    time.sleep(1)
    capture_id_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Capture')")
    capture_id_btn.click()
    
    # Start test
    start_btn = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "button:contains('Start')")
    )
    start_btn.click()
    
    # Verify test started
    question_text = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.question-text"))
    )
    assert question_text.is_displayed()
```

---

## Test Scenario 6: Test Execution - Answer Questions

### Scenario: Candidate answers test questions
```python
def test_answer_questions(self):
    # Assume test is already started
    self.wait = WebDriverWait(self.driver, 10)
    
    # Get total questions
    progress_text = self.driver.find_element(By.CSS_SELECTOR, "div.progress").text
    # Extract total from "1 / 10" format
    total_questions = int(progress_text.split("/")[1].strip())
    
    # Answer each question
    for i in range(total_questions):
        # Wait for question to load
        question = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.question-text"))
        )
        
        # Get all option buttons
        options = self.driver.find_elements(By.CSS_SELECTOR, "button.option-button")
        
        # Select first option (or any logic)
        options[0].click()
        
        # Click next if not last question
        if i < total_questions - 1:
            next_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Next')")
            next_btn.click()
            time.sleep(0.5)
    
    # Submit test
    submit_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Submit')")
    submit_btn.click()
    
    # Verify submission
    submitted_msg = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.submitted-message"))
    )
    assert "submitted" in submitted_msg.text.lower()
```

---

## Test Scenario 7: View Test Results

### Scenario: User views test results
```python
def test_view_results(self):
    self.driver.get("https://www.hrrobots.click/result")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Enter test link
    test_link_input = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input"))
    )
    test_link = "https://www.hrrobots.click/test/test-uuid-12345"
    test_link_input.send_keys(test_link)
    
    # Search
    search_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Search')")
    search_btn.click()
    
    # Wait for results
    results_container = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.results-container"))
    )
    assert results_container.is_displayed()
    
    # Verify results display
    score_display = self.driver.find_element(By.CSS_SELECTOR, "div.score-display")
    assert score_display.is_displayed()
    
    # Verify print button
    print_btn = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Print')")
    assert print_btn.is_displayed()
```

---

## Test Scenario 8: User Profile - Change Password

### Scenario: User changes password
```python
def test_change_password(self):
    self.driver.get("https://www.hrrobots.click/profile")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Fill password fields
    password_inputs = self.wait.until(
        EC.presence_of_all_elements_located((By.CSS_SELECTOR, "input[type='password']"))
    )
    
    new_password = "NewPassword123!"
    password_inputs[0].send_keys(new_password)
    password_inputs[1].send_keys(new_password)
    
    # Submit
    update_btn = self.driver.find_element(By.CSS_SELECTOR, "button.save-btn")
    update_btn.click()
    
    # Verify success
    success_msg = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.profile-message.success"))
    )
    assert "updated" in success_msg.text.lower()
```

---

## Test Scenario 9: Invite User

### Scenario: User invites another user
```python
def test_invite_user(self):
    self.driver.get("https://www.hrrobots.click/profile")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Find invite email input
    email_inputs = self.driver.find_elements(By.CSS_SELECTOR, "input[type='email']")
    invite_email_input = email_inputs[-1]  # Last email input is for invite
    
    invite_email_input.send_keys("newuser@company.com")
    
    # Find and click send invitation button
    save_buttons = self.driver.find_elements(By.CSS_SELECTOR, "button.save-btn")
    send_invite_btn = save_buttons[-1]  # Last save button is for invite
    send_invite_btn.click()
    
    # Verify success
    success_toast = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.toast.success"))
    )
    assert "invitation" in success_toast.text.lower()
```

---

## Test Scenario 10: Failed Login with reCAPTCHA

### Scenario: Multiple failed login attempts trigger reCAPTCHA
```python
def test_failed_login_triggers_recaptcha(self):
    self.driver.get("https://www.hrrobots.click/login")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Attempt login 3 times with wrong password
    for attempt in range(3):
        email_input = self.wait.until(
            EC.presence_of_element_located((By.NAME, "email"))
        )
        email_input.clear()
        email_input.send_keys("testuser@company.com")
        
        password_input = self.driver.find_element(By.NAME, "password")
        password_input.clear()
        password_input.send_keys("WrongPassword123!")
        
        login_btn = self.driver.find_element(By.CSS_SELECTOR, "button.login-btn")
        login_btn.click()
        
        # Wait for error message
        error_msg = self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "div.message-box.error"))
        )
        assert error_msg.is_displayed()
        
        time.sleep(1)
    
    # After 3 attempts, reCAPTCHA notice should appear
    captcha_notice = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.captcha-notice"))
    )
    assert "Security verification" in captcha_notice.text
```

---

## Test Scenario 11: Forgot Password Flow

### Scenario: User resets forgotten password
```python
def test_forgot_password_flow(self):
    self.driver.get("https://www.hrrobots.click/forgot-password")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Enter email
    email_input = self.wait.until(
        EC.presence_of_element_located((By.NAME, "email"))
    )
    email_input.send_keys("testuser@company.com")
    
    # Send reset link
    send_btn = self.driver.find_element(By.CSS_SELECTOR, "button.login-btn")
    send_btn.click()
    
    # Verify success state
    success_state = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.success-state"))
    )
    assert success_state.is_displayed()
    
    # Verify email display
    email_display = self.driver.find_element(By.CSS_SELECTOR, "div.email-display")
    assert "testuser@company.com" in email_display.text
    
    # Verify try again button
    try_again_btn = self.driver.find_element(By.CSS_SELECTOR, "button.login-btn.secondary")
    assert try_again_btn.is_displayed()
```

---

## Test Scenario 12: Template Assignment

### Scenario: User assigns template to recruiter
```python
def test_assign_template(self):
    self.driver.get("https://www.hrrobots.click/list")
    self.wait = WebDriverWait(self.driver, 10)
    
    # Find template card
    template_card = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.template-card"))
    )
    
    # Find assign button (icon button in card)
    assign_buttons = template_card.find_elements(By.CSS_SELECTOR, "button.delete-button")
    assign_btn = assign_buttons[2]  # Third button is assign
    assign_btn.click()
    
    # Fill assign modal
    email_input = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='email']"))
    )
    email_input.send_keys("recruiter@company.com")
    
    # Submit
    assign_submit = self.driver.find_element(By.CSS_SELECTOR, "button:contains('Assign')")
    assign_submit.click()
    
    # Verify success
    success_toast = self.wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "div.toast.success"))
    )
    assert "assigned" in success_toast.text.lower()
```

---

## Utility Functions for Selenium Tests

```python
class SeleniumUtils:
    @staticmethod
    def wait_for_element(driver, locator, timeout=10):
        """Wait for element to be present"""
        wait = WebDriverWait(driver, timeout)
        return wait.until(EC.presence_of_element_located(locator))
    
    @staticmethod
    def wait_for_element_clickable(driver, locator, timeout=10):
        """Wait for element to be clickable"""
        wait = WebDriverWait(driver, timeout)
        return wait.until(EC.element_to_be_clickable(locator))
    
    @staticmethod
    def wait_for_url_contains(driver, text, timeout=10):
        """Wait for URL to contain text"""
        wait = WebDriverWait(driver, timeout)
        wait.until(EC.url_contains(text))
    
    @staticmethod
    def get_toast_message(driver):
        """Get current toast message"""
        try:
            toast = driver.find_element(By.CSS_SELECTOR, "div.toast")
            return toast.text
        except:
            return None
    
    @staticmethod
    def scroll_to_element(driver, element):
        """Scroll element into view"""
        driver.execute_script("arguments[0].scrollIntoView(true);", element)
    
    @staticmethod
    def scroll_to_bottom(driver, element):
        """Scroll element to bottom"""
        driver.execute_script(
            "arguments[0].scrollTop = arguments[0].scrollHeight",
            element
        )
    
    @staticmethod
    def clear_and_send_keys(element, text):
        """Clear field and send keys"""
        element.clear()
        element.send_keys(text)
    
    @staticmethod
    def get_all_text_from_elements(driver, locator):
        """Get text from all matching elements"""
        elements = driver.find_elements(*locator)
        return [elem.text for elem in elements]
```

---

## Test Data Setup

```python
class TestDataSetup:
    TEST_USERS = {
        "valid_user": {
            "email": "testuser@company.com",
            "password": "TestPassword123!"
        },
        "invalid_user": {
            "email": "invalid@gmail.com",
            "password": "WrongPassword123!"
        }
    }
    
    TEST_JD_DATA = {
        "role_name": "Senior Software Engineer",
        "experience": "5",
        "languages": "JavaScript, Python, Java",
        "skills": "AWS, Docker, Agile"
    }
    
    TEST_TEMPLATE_DATA = {
        "name": "Python Basics Test",
        "questions": [
            {
                "text": "Python::: What is the output of print(2 ** 3)?",
                "options": ["8", "6", "9", "3"],
                "correct": "8"
            }
        ]
    }
```

