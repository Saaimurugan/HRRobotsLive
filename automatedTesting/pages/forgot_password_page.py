"""
Forgot Password Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class ForgotPasswordPage(BasePage):
    """Page object for Forgot Password page"""
    
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    SEND_RESET_BUTTON = (By.CSS_SELECTOR, "button.login-btn:not(.secondary)")
    TRY_AGAIN_BUTTON = (By.CSS_SELECTOR, "button.login-btn.secondary")
    SUCCESS_STATE = (By.CSS_SELECTOR, "div.success-state")
    EMAIL_DISPLAY = (By.CSS_SELECTOR, "div.email-display")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "div.message-box.error")
    BACK_TO_LOGIN_LINK = (By.CSS_SELECTOR, "a[href='/login']")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["forgot_password"]
    
    def navigate(self):
        """Navigate to forgot password page"""
        self.navigate_to(self.url)
    
    def enter_email(self, email):
        """Enter email address"""
        self.send_keys(self.EMAIL_INPUT, email)
    
    def click_send_reset_link(self):
        """Click send reset link button"""
        self.click(self.SEND_RESET_BUTTON)
    
    def click_try_again(self):
        """Click try again button"""
        import time
        time.sleep(1)  # Wait for success state to fully render
        self.click(self.TRY_AGAIN_BUTTON)
    
    def click_back_to_login(self):
        """Click back to login link"""
        self.click(self.BACK_TO_LOGIN_LINK)
    
    def request_password_reset(self, email):
        """Request password reset for email"""
        self.enter_email(email)
        self.click_send_reset_link()
        import time
        time.sleep(2)  # Wait for API response
    
    def is_success_state_displayed(self):
        """Check if success state is displayed"""
        return self.is_element_visible(self.SUCCESS_STATE)
    
    def get_displayed_email(self):
        """Get the email displayed in success state"""
        if self.is_element_visible(self.EMAIL_DISPLAY):
            return self.get_text(self.EMAIL_DISPLAY)
        return None
    
    def get_error_message(self):
        """Get error message"""
        if self.is_element_visible(self.ERROR_MESSAGE):
            return self.get_text(self.ERROR_MESSAGE)
        return None
    
    def is_try_again_button_visible(self):
        """Check if try again button is visible"""
        return self.is_element_visible(self.TRY_AGAIN_BUTTON)
