"""
Create Template from JD Modal Page Object
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config import ROUTES


class CreateTemplateFromJDPage(BasePage):
    """Page object for Create Template from JD Modal"""
    
    # Modal Locators
    MODAL_OVERLAY = (By.CSS_SELECTOR, "div.jd-modal-overlay")
    MODAL_CONTENT = (By.CSS_SELECTOR, "div.jd-modal-content")
    MODAL_HEADER = (By.CSS_SELECTOR, "div.jd-modal-header h2")
    MODAL_CLOSE_BUTTON = (By.CSS_SELECTOR, "button.jd-modal-close")
    
    # Step Indicator
    STEP_INDICATOR = (By.CSS_SELECTOR, "div.step-indicator")
    STEP_ACTIVE = (By.CSS_SELECTOR, "div.step.active")
    STEP_COMPLETED = (By.CSS_SELECTOR, "div.step.completed")
    
    # Step 1: Upload JD - Side by Side Layout
    JD_INPUT_ROW = (By.CSS_SELECTOR, "div.jd-input-row")
    UPLOAD_SECTION = (By.CSS_SELECTOR, "div.upload-section-jd")
    UPLOAD_CARD = (By.CSS_SELECTOR, "div.upload-card-jd")
    PDF_UPLOAD_INPUT = (By.ID, "jd-upload-modal")
    PDF_UPLOAD_LABEL = (By.CSS_SELECTOR, "label[for='jd-upload-modal']")
    FILE_NAME_DISPLAY = (By.CSS_SELECTOR, "div.upload-card-jd div.file-name")
    JD_DIVIDER = (By.CSS_SELECTOR, "div.jd-divider")
    JD_TEXT_SECTION = (By.CSS_SELECTOR, "div.jd-text-section")
    JD_TEXT_AREA = (By.CSS_SELECTOR, "div.jd-text-section textarea")
    EXTRACT_KEYWORDS_BUTTON = (By.XPATH, "//button[contains(., 'Extract Keywords')]")
    EXTRACTING_SPINNER = (By.CSS_SELECTOR, "button.btn-primary svg.spinner")
    
    # Step 2: Keywords Selection
    KEYWORDS_SECTION = (By.CSS_SELECTOR, "div.keywords-section")
    KEYWORDS_HEADER = (By.CSS_SELECTOR, "div.keywords-header h3")
    TOTAL_QUESTIONS_BADGE = (By.CSS_SELECTOR, "div.total-questions span")
    KEYWORDS_LIST = (By.CSS_SELECTOR, "div.keywords-list")
    KEYWORD_ITEMS = (By.CSS_SELECTOR, "div.keyword-item")
    KEYWORD_CHECKBOX = (By.CSS_SELECTOR, "input[type='checkbox']")
    KEYWORD_NAME = (By.CSS_SELECTOR, "span.keyword-name")
    QUESTION_COUNT_INPUT = (By.CSS_SELECTOR, "div.question-count-input input[type='number']")
    COUNT_DECREASE_BTN = (By.XPATH, ".//button[contains(@class, 'count-btn')][1]")
    COUNT_INCREASE_BTN = (By.XPATH, ".//button[contains(@class, 'count-btn')][2]")
    GENERATE_QUESTIONS_BUTTON = (By.XPATH, "//button[contains(., 'Generate Questions')]")
    
    # Step 3: Generated Questions
    GENERATION_PROGRESS = (By.CSS_SELECTOR, "div.generation-progress")
    PROGRESS_BAR = (By.CSS_SELECTOR, "div.progress-bar")
    PROGRESS_TEXT = (By.CSS_SELECTOR, "div.progress-text")
    CURRENT_KEYWORD_TEXT = (By.CSS_SELECTOR, "div.progress-header strong")
    GENERATED_QUESTIONS_SECTION = (By.CSS_SELECTOR, "div.generated-questions-section")
    QUESTIONS_HEADER = (By.CSS_SELECTOR, "div.questions-header h3")
    USE_QUESTIONS_BUTTON = (By.XPATH, "//button[contains(., 'Use These Questions')]")
    QUESTIONS_LIST = (By.CSS_SELECTOR, "div.questions-list-modal")
    QUESTION_CARDS = (By.CSS_SELECTOR, "div.qcard")
    DELETE_QUESTION_BUTTON = (By.CSS_SELECTOR, "button.btn-danger")
    
    # Navigation Buttons
    BACK_BUTTON = (By.CSS_SELECTOR, "button.btn-secondary")
    
    def __init__(self, driver):
        super().__init__(driver)
    
    def is_modal_open(self):
        """Check if the JD modal is open"""
        return self.is_element_visible(self.MODAL_OVERLAY)
    
    def wait_for_modal(self, timeout=10):
        """Wait for modal to be visible"""
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.visibility_of_element_located(self.MODAL_CONTENT))
    
    def close_modal(self):
        """Close the modal"""
        self.click(self.MODAL_CLOSE_BUTTON)

    def get_modal_title(self):
        """Get modal header title"""
        return self.get_text(self.MODAL_HEADER)
    
    def get_current_step(self):
        """Get current active step number"""
        active_steps = self.find_elements(self.STEP_ACTIVE)
        return len(active_steps)
    
    # Step 1: Upload/Paste JD Methods
    def is_side_by_side_layout_visible(self):
        """Check if the side-by-side layout (upload + paste) is visible"""
        return self.is_element_visible(self.JD_INPUT_ROW)
    
    def is_upload_section_visible(self):
        """Check if upload section is visible"""
        return self.is_element_visible(self.UPLOAD_SECTION)
    
    def is_text_section_visible(self):
        """Check if text section is visible"""
        return self.is_element_visible(self.JD_TEXT_SECTION)
    
    def is_divider_visible(self):
        """Check if OR divider is visible"""
        return self.is_element_visible(self.JD_DIVIDER)
    
    def upload_pdf(self, file_path):
        """Upload a PDF file"""
        pdf_input = self.find_element(self.PDF_UPLOAD_INPUT)
        pdf_input.send_keys(file_path)
    
    def is_file_uploaded(self):
        """Check if a file has been uploaded"""
        return self.is_element_visible(self.FILE_NAME_DISPLAY)
    
    def get_uploaded_file_name(self):
        """Get the uploaded file name"""
        if self.is_file_uploaded():
            return self.get_text(self.FILE_NAME_DISPLAY)
        return None
    
    def enter_jd_text(self, text):
        """Enter JD text in textarea"""
        textarea = self.find_element(self.JD_TEXT_AREA)
        textarea.clear()
        textarea.send_keys(text)
    
    def get_jd_text(self):
        """Get current JD text"""
        textarea = self.find_element(self.JD_TEXT_AREA)
        return textarea.get_attribute("value")
    
    def click_extract_keywords(self):
        """Click Extract Keywords button"""
        self.click(self.EXTRACT_KEYWORDS_BUTTON)
    
    def is_extract_button_enabled(self):
        """Check if Extract Keywords button is enabled"""
        button = self.find_element(self.EXTRACT_KEYWORDS_BUTTON)
        return button.is_enabled()
    
    def is_extracting(self):
        """Check if keywords are being extracted"""
        return self.is_element_visible(self.EXTRACTING_SPINNER)
    
    def wait_for_extraction_complete(self, timeout=30):
        """Wait for keyword extraction to complete"""
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.visibility_of_element_located(self.KEYWORDS_SECTION)
            )
            return True
        except:
            return False
    
    def complete_step1_with_text(self, jd_text):
        """Complete step 1 by entering JD text and extracting keywords"""
        self.enter_jd_text(jd_text)
        self.click_extract_keywords()
        self.wait_for_extraction_complete()
    
    # Step 2: Keywords Selection Methods
    def get_keyword_count(self):
        """Get number of extracted keywords"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        return len(keywords)
    
    def get_keyword_names(self):
        """Get list of keyword names"""
        keyword_elements = self.find_elements(self.KEYWORD_ITEMS)
        names = []
        for kw in keyword_elements:
            name_elem = kw.find_element(*self.KEYWORD_NAME)
            names.append(name_elem.text)
        return names
    
    def is_keyword_selected(self, index):
        """Check if keyword at index is selected"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            checkbox = keywords[index].find_element(*self.KEYWORD_CHECKBOX)
            return checkbox.is_selected()
        return False
    
    def toggle_keyword(self, index):
        """Toggle keyword selection at index"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            checkbox = keywords[index].find_element(*self.KEYWORD_CHECKBOX)
            checkbox.click()
    
    def deselect_all_keywords(self):
        """Deselect all keywords"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        for i, kw in enumerate(keywords):
            checkbox = kw.find_element(*self.KEYWORD_CHECKBOX)
            if checkbox.is_selected():
                checkbox.click()
    
    def select_all_keywords(self):
        """Select all keywords"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        for kw in keywords:
            checkbox = kw.find_element(*self.KEYWORD_CHECKBOX)
            if not checkbox.is_selected():
                checkbox.click()

    def get_question_count_for_keyword(self, index):
        """Get question count for keyword at index"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            count_input = keywords[index].find_element(*self.QUESTION_COUNT_INPUT)
            return int(count_input.get_attribute("value"))
        return 0
    
    def set_question_count(self, index, count):
        """Set question count for keyword at index"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            count_input = keywords[index].find_element(*self.QUESTION_COUNT_INPUT)
            count_input.clear()
            count_input.send_keys(str(count))
    
    def increment_question_count(self, index):
        """Increment question count for keyword"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            inc_btn = keywords[index].find_elements(By.CSS_SELECTOR, "button.count-btn")[1]
            inc_btn.click()
    
    def decrement_question_count(self, index):
        """Decrement question count for keyword"""
        keywords = self.find_elements(self.KEYWORD_ITEMS)
        if index < len(keywords):
            dec_btn = keywords[index].find_elements(By.CSS_SELECTOR, "button.count-btn")[0]
            dec_btn.click()
    
    def get_total_questions(self):
        """Get total questions count from badge"""
        badge = self.find_element(self.TOTAL_QUESTIONS_BADGE)
        return int(badge.text)
    
    def click_generate_questions(self):
        """Click Generate Questions button"""
        self.click(self.GENERATE_QUESTIONS_BUTTON)
    
    def is_generate_button_enabled(self):
        """Check if Generate Questions button is enabled"""
        button = self.find_element(self.GENERATE_QUESTIONS_BUTTON)
        return button.is_enabled()
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
    
    # Step 3: Generated Questions Methods
    def is_generation_in_progress(self):
        """Check if question generation is in progress"""
        return self.is_element_visible(self.GENERATION_PROGRESS)
    
    def get_generation_progress_text(self):
        """Get generation progress text"""
        if self.is_generation_in_progress():
            return self.get_text(self.PROGRESS_TEXT)
        return None
    
    def get_current_generating_keyword(self):
        """Get the keyword currently being generated"""
        if self.is_generation_in_progress():
            return self.get_text(self.CURRENT_KEYWORD_TEXT)
        return None
    
    def wait_for_generation_complete(self, timeout=120):
        """Wait for question generation to complete"""
        try:
            WebDriverWait(self.driver, timeout).until(
                EC.invisibility_of_element_located(self.GENERATION_PROGRESS)
            )
            return True
        except:
            return False
    
    def get_generated_question_count(self):
        """Get number of generated questions"""
        questions = self.find_elements(self.QUESTION_CARDS)
        return len(questions)
    
    def delete_question(self, index):
        """Delete question at index"""
        questions = self.find_elements(self.QUESTION_CARDS)
        if index < len(questions):
            delete_btn = questions[index].find_element(*self.DELETE_QUESTION_BUTTON)
            delete_btn.click()
    
    def click_use_questions(self):
        """Click Use These Questions button"""
        self.click(self.USE_QUESTIONS_BUTTON)
    
    def is_use_questions_button_visible(self):
        """Check if Use These Questions button is visible"""
        return self.is_element_visible(self.USE_QUESTIONS_BUTTON)
