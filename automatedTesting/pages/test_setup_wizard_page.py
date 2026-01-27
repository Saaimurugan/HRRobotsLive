"""
Test Setup Wizard Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
import time


class TestSetupWizardPage(BasePage):
    """Page object for Test Setup Wizard"""
    
    # Locators
    WIZARD_CONTAINER = (By.CSS_SELECTOR, ".test-setup-wizard, .wizard-container")
    STEP_INDICATOR = (By.CSS_SELECTOR, ".step-indicator, .wizard-steps")
    CURRENT_STEP_TITLE = (By.CSS_SELECTOR, ".step-title, h2, h3")
    
    # Step 1: System Check
    SYSTEM_CHECK_SECTION = (By.CSS_SELECTOR, ".system-check, .device-check")
    CAMERA_STATUS = (By.CSS_SELECTOR, ".camera-status, .camera-check")
    MIC_STATUS = (By.CSS_SELECTOR, ".mic-status, .microphone-check")
    CLIPBOARD_STATUS = (By.CSS_SELECTOR, ".clipboard-status, .clipboard-check")
    SCREEN_STATUS = (By.CSS_SELECTOR, ".screen-status, .screen-check")
    NEXT_BUTTON = (By.CSS_SELECTOR, "button.next, .next-btn, button[data-testid='next']")
    
    # Step 2: Test Guidelines
    GUIDELINES_SECTION = (By.CSS_SELECTOR, ".guidelines, .test-guidelines")
    GUIDELINES_CONTENT = (By.CSS_SELECTOR, ".guidelines-content, .guidelines-text")
    GUIDELINES_CHECKBOX = (By.CSS_SELECTOR, "input[type='checkbox'].guidelines, .guidelines-checkbox")
    DEMO_VIDEO = (By.CSS_SELECTOR, ".demo-video, video")
    DEMO_VIDEO_EXPAND = (By.CSS_SELECTOR, ".expand-video, .video-expand")
    
    # Step 3: Data Consent
    CONSENT_SECTION = (By.CSS_SELECTOR, ".consent, .data-consent")
    CONSENT_TEXT = (By.CSS_SELECTOR, ".consent-text, .consent-content")
    CONSENT_SCROLL_AREA = (By.CSS_SELECTOR, ".consent-scroll, .scrollable-content")
    CONSENT_CHECKBOX = (By.CSS_SELECTOR, "input[type='checkbox'].consent, .consent-checkbox")
    
    # Step 4: Identity Verification
    IDENTITY_SECTION = (By.CSS_SELECTOR, ".identity-verification, .photo-capture")
    CANDIDATE_NAME_INPUT = (By.CSS_SELECTOR, "input[name='candidateName'], .candidate-name")
    VIDEO_PREVIEW = (By.CSS_SELECTOR, "video.preview, .video-preview")
    CAPTURE_PHOTO_BUTTON = (By.CSS_SELECTOR, "button.capture-photo, .capture-btn")
    CAPTURE_ID_BUTTON = (By.CSS_SELECTOR, "button.capture-id, .id-capture-btn")
    RETAKE_BUTTON = (By.CSS_SELECTOR, "button.retake, .retake-btn")
    PHOTO_PREVIEW = (By.CSS_SELECTOR, ".photo-preview, .captured-photo")
    ID_PREVIEW = (By.CSS_SELECTOR, ".id-preview, .captured-id")
    
    # Common elements
    BACK_BUTTON = (By.CSS_SELECTOR, "button.back, .back-btn, button[data-testid='back']")
    COMPLETE_BUTTON = (By.CSS_SELECTOR, "button.complete, .complete-btn, button[data-testid='complete']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error-message, .error")
    LOADING_INDICATOR = (By.CSS_SELECTOR, ".loading, .spinner")
    
    def __init__(self, driver):
        super().__init__(driver)
    
    def is_wizard_loaded(self):
        """Check if wizard is loaded"""
        return self.is_element_visible(self.WIZARD_CONTAINER, timeout=10)
    
    def get_current_step_title(self):
        """Get current step title"""
        if self.is_element_visible(self.CURRENT_STEP_TITLE):
            return self.get_text(self.CURRENT_STEP_TITLE)
        return None
    
    def click_next(self):
        """Click next button"""
        self.click(self.NEXT_BUTTON)
        time.sleep(1)  # Wait for step transition
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
        time.sleep(1)  # Wait for step transition
    
    def click_complete(self):
        """Click complete button"""
        self.click(self.COMPLETE_BUTTON)
    
    # Step 1: System Check methods
    def is_system_check_visible(self):
        """Check if system check section is visible"""
        return self.is_element_visible(self.SYSTEM_CHECK_SECTION)
    
    def get_camera_status(self):
        """Get camera permission status"""
        if self.is_element_visible(self.CAMERA_STATUS):
            return self.get_text(self.CAMERA_STATUS)
        return None
    
    def get_mic_status(self):
        """Get microphone permission status"""
        if self.is_element_visible(self.MIC_STATUS):
            return self.get_text(self.MIC_STATUS)
        return None
    
    # Step 2: Guidelines methods
    def is_guidelines_visible(self):
        """Check if guidelines section is visible"""
        return self.is_element_visible(self.GUIDELINES_SECTION)
    
    def accept_guidelines(self):
        """Accept test guidelines"""
        if self.is_element_visible(self.GUIDELINES_CHECKBOX):
            checkbox = self.find_element(self.GUIDELINES_CHECKBOX)
            if not checkbox.is_selected():
                self.click(self.GUIDELINES_CHECKBOX)
    
    def expand_demo_video(self):
        """Expand demo video"""
        if self.is_element_visible(self.DEMO_VIDEO_EXPAND):
            self.click(self.DEMO_VIDEO_EXPAND)
    
    def is_demo_video_visible(self):
        """Check if demo video is visible"""
        return self.is_element_visible(self.DEMO_VIDEO)
    
    # Step 3: Consent methods
    def is_consent_visible(self):
        """Check if consent section is visible"""
        return self.is_element_visible(self.CONSENT_SECTION)
    
    def scroll_consent_to_bottom(self):
        """Scroll consent text to bottom"""
        if self.is_element_visible(self.CONSENT_SCROLL_AREA):
            consent_area = self.find_element(self.CONSENT_SCROLL_AREA)
            self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", consent_area)
            time.sleep(1)
    
    def accept_consent(self):
        """Accept data consent"""
        if self.is_element_visible(self.CONSENT_CHECKBOX):
            checkbox = self.find_element(self.CONSENT_CHECKBOX)
            if not checkbox.is_selected():
                self.click(self.CONSENT_CHECKBOX)
    
    # Step 4: Identity Verification methods
    def is_identity_verification_visible(self):
        """Check if identity verification section is visible"""
        return self.is_element_visible(self.IDENTITY_SECTION)
    
    def enter_candidate_name(self, name):
        """Enter candidate name"""
        if self.is_element_visible(self.CANDIDATE_NAME_INPUT):
            self.send_keys(self.CANDIDATE_NAME_INPUT, name)
    
    def is_video_preview_active(self):
        """Check if video preview is active"""
        return self.is_element_visible(self.VIDEO_PREVIEW)
    
    def capture_photo(self):
        """Capture candidate photo"""
        if self.is_element_visible(self.CAPTURE_PHOTO_BUTTON):
            self.click(self.CAPTURE_PHOTO_BUTTON)
            time.sleep(2)  # Wait for capture
    
    def capture_id_card(self):
        """Capture ID card photo"""
        if self.is_element_visible(self.CAPTURE_ID_BUTTON):
            self.click(self.CAPTURE_ID_BUTTON)
            time.sleep(2)  # Wait for capture
    
    def retake_photo(self):
        """Retake photo"""
        if self.is_element_visible(self.RETAKE_BUTTON):
            self.click(self.RETAKE_BUTTON)
            time.sleep(1)
    
    def is_photo_captured(self):
        """Check if photo is captured"""
        return self.is_element_visible(self.PHOTO_PREVIEW)
    
    def is_id_captured(self):
        """Check if ID card is captured"""
        return self.is_element_visible(self.ID_PREVIEW)
    
    # Complete workflow methods
    def complete_system_check_step(self):
        """Complete system check step"""
        if self.is_system_check_visible():
            # Wait for system checks to complete
            time.sleep(3)
            self.click_next()
    
    def complete_guidelines_step(self):
        """Complete guidelines step"""
        if self.is_guidelines_visible():
            self.accept_guidelines()
            self.click_next()
    
    def complete_consent_step(self):
        """Complete consent step"""
        if self.is_consent_visible():
            self.scroll_consent_to_bottom()
            self.accept_consent()
            self.click_next()
    
    def complete_identity_verification_step(self, candidate_name="Test Candidate"):
        """Complete identity verification step"""
        if self.is_identity_verification_visible():
            self.enter_candidate_name(candidate_name)
            
            # Only proceed with photo capture if video is available
            if self.is_video_preview_active():
                self.capture_photo()
                time.sleep(2)
                self.capture_id_card()
                time.sleep(2)
            
            self.click_complete()
    
    def complete_full_wizard(self, candidate_name="Test Candidate"):
        """Complete the entire wizard workflow"""
        if not self.is_wizard_loaded():
            return False
        
        # Step 1: System Check
        self.complete_system_check_step()
        
        # Step 2: Guidelines
        self.complete_guidelines_step()
        
        # Step 3: Consent
        self.complete_consent_step()
        
        # Step 4: Identity Verification
        self.complete_identity_verification_step(candidate_name)
        
        return True
    
    def get_error_message(self):
        """Get error message"""
        if self.is_element_visible(self.ERROR_MESSAGE):
            return self.get_text(self.ERROR_MESSAGE)
        return None
    
    def is_loading(self):
        """Check if wizard is in loading state"""
        return self.is_element_visible(self.LOADING_INDICATOR, timeout=5)