"""
Test Execution Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
import time


class TestPage(BasePage):
    """Page object for Test Execution page"""
    
    # Setup Wizard Locators
    WIZARD_CONTAINER = (By.CSS_SELECTOR, "div.wizard-container, div.setup-wizard")
    STEP_INDICATOR = (By.CSS_SELECTOR, "div.step-indicator, div.step-progress")
    NEXT_BUTTON = (By.XPATH, "//button[contains(., 'Next')]")
    
    # Step 1: System Check
    CAMERA_PERMISSION = (By.XPATH, "//div[contains(., 'Camera')]")
    MIC_PERMISSION = (By.XPATH, "//div[contains(., 'Microphone')]")
    CLIPBOARD_PERMISSION = (By.XPATH, "//div[contains(., 'Clipboard')]")
    
    # Step 2: Guidelines
    GUIDELINES_CHECKBOX = (By.XPATH, "//input[@type='checkbox'][1]")
    CANDIDATE_NAME_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Name'], input[name='candidateName']")
    
    # Step 3: Consent
    CONSENT_SCROLL = (By.CSS_SELECTOR, "div.consent-scroll")
    CONSENT_CHECKBOX = (By.XPATH, "//input[@type='checkbox']")
    
    # Step 4: Identity
    VIDEO_ELEMENT = (By.TAG_NAME, "video")
    CANVAS_ELEMENT = (By.TAG_NAME, "canvas")
    CAPTURE_PHOTO_BUTTON = (By.XPATH, "//button[contains(., 'Capture')]")
    START_TEST_BUTTON = (By.XPATH, "//button[contains(., 'Start')]")
    
    # Test Interface Locators
    QUESTION_TEXT = (By.CSS_SELECTOR, "div.question-text")
    QUESTION_OPTIONS = (By.CSS_SELECTOR, "div.question-options")
    OPTION_BUTTONS = (By.CSS_SELECTOR, "button.option-button")
    PREVIOUS_BUTTON = (By.XPATH, "//button[contains(., 'Previous')]")
    SUBMIT_BUTTON = (By.XPATH, "//button[contains(., 'Submit')]")
    TIMER = (By.CSS_SELECTOR, "div.timer")
    PROGRESS = (By.CSS_SELECTOR, "div.progress")
    QUESTION_COUNTER = (By.CSS_SELECTOR, "span.question-counter")
    
    # Proctoring Warnings
    FULLSCREEN_WARNING = (By.CSS_SELECTOR, "div.proctor-warning, div.fullscreen-warning")
    FACE_WARNING = (By.CSS_SELECTOR, "div.face-warning")
    MULTIPLE_FACES_WARNING = (By.CSS_SELECTOR, "div.multiple-faces-warning")
    
    # Submission
    SUBMITTED_MESSAGE = (By.CSS_SELECTOR, "div.submitted-message, div.success-message")
    
    def __init__(self, driver):
        super().__init__(driver)
    
    def navigate_to_test(self, test_id):
        """Navigate to test page"""
        from config import BASE_URL
        self.navigate_to(f"{BASE_URL}/test/{test_id}")
    
    # Setup Wizard Methods
    def click_next(self):
        """Click next button"""
        self.click(self.NEXT_BUTTON)
    
    def accept_guidelines(self):
        """Accept test guidelines"""
        checkbox = self.find_element(self.GUIDELINES_CHECKBOX)
        if not checkbox.is_selected():
            checkbox.click()
    
    def enter_candidate_name(self, name):
        """Enter candidate name"""
        self.send_keys(self.CANDIDATE_NAME_INPUT, name)
    
    def scroll_consent_to_bottom(self):
        """Scroll consent area to bottom"""
        consent_area = self.find_element(self.CONSENT_SCROLL)
        self.driver.execute_script(
            "arguments[0].scrollTop = arguments[0].scrollHeight",
            consent_area
        )
        time.sleep(0.5)
    
    def accept_consent(self):
        """Accept data consent"""
        checkboxes = self.find_elements(self.CONSENT_CHECKBOX)
        for checkbox in checkboxes:
            if not checkbox.is_selected():
                checkbox.click()
    
    def capture_photo(self):
        """Capture candidate photo"""
        self.click(self.CAPTURE_PHOTO_BUTTON)
        time.sleep(1)
    
    def start_test(self):
        """Start the test"""
        self.click(self.START_TEST_BUTTON)
    
    def complete_setup_wizard(self, candidate_name):
        """Complete the entire setup wizard"""
        # Step 1: System Check - just click next
        time.sleep(2)
        self.click_next()
        
        # Step 2: Guidelines
        time.sleep(1)
        self.accept_guidelines()
        self.enter_candidate_name(candidate_name)
        self.click_next()
        
        # Step 3: Consent
        time.sleep(1)
        self.scroll_consent_to_bottom()
        self.accept_consent()
        self.click_next()
        
        # Step 4: Identity
        time.sleep(1)
        self.capture_photo()
        time.sleep(1)
        self.capture_photo()  # Capture ID
        self.start_test()
    
    # Test Interface Methods
    def get_question_text(self):
        """Get current question text"""
        return self.get_text(self.QUESTION_TEXT)
    
    def get_options(self):
        """Get all option buttons"""
        return self.find_elements(self.OPTION_BUTTONS)
    
    def select_option(self, index):
        """Select option by index"""
        options = self.get_options()
        if index < len(options):
            options[index].click()
    
    def select_option_by_text(self, text):
        """Select option by text"""
        options = self.get_options()
        for option in options:
            if text in option.text:
                option.click()
                return
    
    def click_previous(self):
        """Click previous button"""
        self.click(self.PREVIOUS_BUTTON)
    
    def click_submit(self):
        """Click submit button"""
        self.click(self.SUBMIT_BUTTON)
    
    def get_timer_value(self):
        """Get timer value"""
        if self.is_element_visible(self.TIMER):
            return self.get_text(self.TIMER)
        return None
    
    def get_progress(self):
        """Get progress text"""
        if self.is_element_visible(self.PROGRESS):
            return self.get_text(self.PROGRESS)
        return None
    
    def get_current_question_number(self):
        """Get current question number"""
        progress = self.get_progress()
        if progress:
            try:
                return int(progress.split("/")[0].strip())
            except:
                pass
        return None
    
    def get_total_questions(self):
        """Get total number of questions"""
        progress = self.get_progress()
        if progress:
            try:
                return int(progress.split("/")[1].strip())
            except:
                pass
        return None
    
    def answer_all_questions(self, answer_index=0):
        """Answer all questions with specified option index"""
        total = self.get_total_questions()
        if not total:
            return
        
        for i in range(total):
            self.select_option(answer_index)
            time.sleep(0.5)
            
            if i < total - 1:
                self.click_next()
                time.sleep(0.5)
        
        self.click_submit()
    
    def is_test_submitted(self):
        """Check if test was submitted"""
        return self.is_element_visible(self.SUBMITTED_MESSAGE)
    
    def is_fullscreen_warning_displayed(self):
        """Check if fullscreen warning is displayed"""
        return self.is_element_visible(self.FULLSCREEN_WARNING)
    
    def is_face_warning_displayed(self):
        """Check if face warning is displayed"""
        return self.is_element_visible(self.FACE_WARNING)
