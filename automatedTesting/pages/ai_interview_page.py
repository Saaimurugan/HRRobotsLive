"""
AI Interview Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES
import os


class AIInterviewPage(BasePage):
    """Page object for AI Interview page"""
    
    # Locators
    JD_FILE_INPUT = (By.CSS_SELECTOR, "input[type='file'][accept='.pdf']")
    RESUME_FILE_INPUT = (By.CSS_SELECTOR, "input[type='file'][accept='.pdf']:nth-of-type(2)")
    JD_UPLOAD_BUTTON = (By.CSS_SELECTOR, "button[data-testid='jd-upload'], .jd-upload-btn")
    RESUME_UPLOAD_BUTTON = (By.CSS_SELECTOR, "button[data-testid='resume-upload'], .resume-upload-btn")
    GENERATE_REPORT_BUTTON = (By.CSS_SELECTOR, "button[data-testid='generate-report'], .generate-report-btn")
    GENERATE_INTERVIEW_BUTTON = (By.CSS_SELECTOR, "button[data-testid='generate-interview'], .generate-interview-btn")
    UPLOAD_STATUS = (By.CSS_SELECTOR, ".upload-status, .status-message")
    LOADING_INDICATOR = (By.CSS_SELECTOR, ".loading, .spinner, .generating")
    REPORT_SECTION = (By.CSS_SELECTOR, ".report-section, .ai-report")
    INTERVIEW_LINK = (By.CSS_SELECTOR, ".interview-link, a[href*='interview']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error-message, .error")
    SUCCESS_MESSAGE = (By.CSS_SELECTOR, ".success-message, .success")
    JD_TEXT_PREVIEW = (By.CSS_SELECTOR, ".jd-text-preview, .jd-content")
    RESUME_TEXT_PREVIEW = (By.CSS_SELECTOR, ".resume-text-preview, .resume-content")
    POPUP_MODAL = (By.CSS_SELECTOR, ".popup, .modal")
    POPUP_CLOSE_BUTTON = (By.CSS_SELECTOR, ".popup-close, .modal-close")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = f"{ROUTES['dashboard']}/ai-interview"  # Assuming AI interview is accessible from dashboard
    
    def navigate(self):
        """Navigate to AI interview page"""
        self.navigate_to(self.url)
        self.wait_for_loading()
    
    def upload_jd_file(self, file_path):
        """Upload job description PDF file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"JD file not found: {file_path}")
        
        file_input = self.find_element(self.JD_FILE_INPUT)
        file_input.send_keys(os.path.abspath(file_path))
        
        # Wait for upload processing
        self.wait_for_loading()
    
    def upload_resume_file(self, file_path):
        """Upload resume PDF file"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Resume file not found: {file_path}")
        
        # Find the second file input (for resume)
        file_inputs = self.find_elements((By.CSS_SELECTOR, "input[type='file'][accept='.pdf']"))
        if len(file_inputs) >= 2:
            file_inputs[1].send_keys(os.path.abspath(file_path))
        else:
            resume_input = self.find_element(self.RESUME_FILE_INPUT)
            resume_input.send_keys(os.path.abspath(file_path))
        
        # Wait for upload processing
        self.wait_for_loading()
    
    def click_generate_report(self):
        """Click generate report button"""
        self.click(self.GENERATE_REPORT_BUTTON)
        self.wait_for_loading()
    
    def click_generate_interview(self):
        """Click generate interview button"""
        self.click(self.GENERATE_INTERVIEW_BUTTON)
        self.wait_for_loading()
    
    def get_upload_status(self):
        """Get upload status message"""
        if self.is_element_visible(self.UPLOAD_STATUS):
            return self.get_text(self.UPLOAD_STATUS)
        return None
    
    def get_error_message(self):
        """Get error message"""
        if self.is_element_visible(self.ERROR_MESSAGE):
            return self.get_text(self.ERROR_MESSAGE)
        return None
    
    def get_success_message(self):
        """Get success message"""
        if self.is_element_visible(self.SUCCESS_MESSAGE):
            return self.get_text(self.SUCCESS_MESSAGE)
        return None
    
    def is_report_generated(self):
        """Check if report is generated"""
        return self.is_element_visible(self.REPORT_SECTION, timeout=30)
    
    def is_interview_link_available(self):
        """Check if interview link is available"""
        return self.is_element_visible(self.INTERVIEW_LINK, timeout=30)
    
    def get_interview_link(self):
        """Get interview link"""
        if self.is_element_visible(self.INTERVIEW_LINK):
            link_element = self.find_element(self.INTERVIEW_LINK)
            return link_element.get_attribute('href')
        return None
    
    def is_jd_text_visible(self):
        """Check if JD text preview is visible"""
        return self.is_element_visible(self.JD_TEXT_PREVIEW)
    
    def is_resume_text_visible(self):
        """Check if resume text preview is visible"""
        return self.is_element_visible(self.RESUME_TEXT_PREVIEW)
    
    def is_loading(self):
        """Check if page is in loading state"""
        return self.is_element_visible(self.LOADING_INDICATOR, timeout=5)
    
    def wait_for_generation_complete(self, timeout=60):
        """Wait for report/interview generation to complete"""
        import time
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if not self.is_loading():
                break
            time.sleep(2)
        
        # Additional wait for content to appear
        time.sleep(3)
    
    def close_popup_if_visible(self):
        """Close popup modal if visible"""
        if self.is_element_visible(self.POPUP_MODAL):
            self.click(self.POPUP_CLOSE_BUTTON)
    
    def upload_files_and_generate_report(self, jd_file_path, resume_file_path):
        """Complete workflow: upload files and generate report"""
        self.upload_jd_file(jd_file_path)
        self.upload_resume_file(resume_file_path)
        self.click_generate_report()
        self.wait_for_generation_complete()
    
    def upload_files_and_generate_interview(self, jd_file_path, resume_file_path):
        """Complete workflow: upload files and generate interview"""
        self.upload_jd_file(jd_file_path)
        self.upload_resume_file(resume_file_path)
        self.click_generate_interview()
        self.wait_for_generation_complete()