"""
Candidate Profiler Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class ProfilerPage(BasePage):
    """Page object for Candidate Profiler page"""
    
    # Locators
    BACK_BUTTON = (By.CSS_SELECTOR, "button.profiler-back-btn")
    JD_UPLOAD_INPUT = (By.ID, "jd-upload")
    JD_UPLOAD_LABEL = (By.CSS_SELECTOR, "label[for='jd-upload']")
    JD_FILE_NAME = (By.XPATH, "//div[contains(@class, 'upload-card')][1]//div[contains(@class, 'file-name')]")
    RESUME_UPLOAD_INPUT = (By.ID, "resume-upload")
    RESUME_UPLOAD_LABEL = (By.CSS_SELECTOR, "label[for='resume-upload']")
    RESUME_FILE_NAME = (By.XPATH, "//div[contains(@class, 'upload-card')][2]//div[contains(@class, 'file-name')]")
    GENERATE_BUTTON = (By.CSS_SELECTOR, "button.submit-btn")
    PRINT_BUTTON = (By.CSS_SELECTOR, "button.print-btn")
    REPORT_SECTION = (By.CSS_SELECTOR, "div.report-section")
    REPORT_CARD = (By.CSS_SELECTOR, "div.report-card")
    REPORT_TABLE = (By.CSS_SELECTOR, "table.report-table")
    SUITABILITY_BADGE = (By.CSS_SELECTOR, "span.suitability-badge")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["profiler"]
    
    def navigate(self):
        """Navigate to profiler page"""
        self.navigate_to(self.url)
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
    
    def upload_jd(self, file_path):
        """Upload JD PDF file"""
        jd_input = self.find_element(self.JD_UPLOAD_INPUT)
        jd_input.send_keys(file_path)
    
    def upload_resume(self, file_path):
        """Upload resume PDF file"""
        resume_input = self.find_element(self.RESUME_UPLOAD_INPUT)
        resume_input.send_keys(file_path)
    
    def click_generate(self):
        """Click generate report button"""
        self.click(self.GENERATE_BUTTON)
    
    def click_print(self):
        """Click print button"""
        self.click(self.PRINT_BUTTON)
    
    def generate_profile_report(self, jd_path, resume_path):
        """Generate profile report with JD and resume"""
        self.upload_jd(jd_path)
        import time
        time.sleep(1)  # Wait for file to be processed
        self.upload_resume(resume_path)
        time.sleep(1)  # Wait for file to be processed
        self.click_generate()
    
    def is_report_generated(self, timeout=60):
        """Check if report is generated"""
        from selenium.webdriver.support.ui import WebDriverWait
        from selenium.webdriver.support import expected_conditions as EC
        from selenium.common.exceptions import TimeoutException
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.visibility_of_element_located(self.REPORT_SECTION))
            return True
        except TimeoutException:
            # Try alternative selectors
            try:
                wait = WebDriverWait(self.driver, 5)
                wait.until(EC.visibility_of_element_located(self.REPORT_CARD))
                return True
            except TimeoutException:
                return False
    
    def get_suitability_score(self):
        """Get suitability score from badge"""
        if self.is_element_visible(self.SUITABILITY_BADGE):
            return self.get_text(self.SUITABILITY_BADGE)
        return None
    
    def get_report_content(self):
        """Get report table content"""
        if self.is_element_visible(self.REPORT_TABLE):
            return self.get_text(self.REPORT_TABLE)
        return None
    
    def is_jd_uploaded(self):
        """Check if JD file is uploaded"""
        return self.is_element_visible(self.JD_FILE_NAME)
    
    def is_resume_uploaded(self):
        """Check if resume file is uploaded"""
        return self.is_element_visible(self.RESUME_FILE_NAME)
    
    def is_print_button_visible(self):
        """Check if print button is visible"""
        return self.is_element_visible(self.PRINT_BUTTON)
