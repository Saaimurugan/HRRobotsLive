"""
Login Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class LoginPage(BasePage):
    """Page object for Login page"""
    
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    LOGIN_BUTTON = (By.CSS_SELECTOR, "button.login-btn")
    FORGOT_PASSWORD_LINK = (By.CSS_SELECTOR, "span.forgot-link")
    SIGNUP_LINK = (By.CSS_SELECTOR, "a[href='/signup']")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "div.message-box.error")
    SUCCESS_MESSAGE = (By.CSS_SELECTOR, "div.message-box.success")
    PASSWORD_TOGGLE = (By.CSS_SELECTOR, "button.password-toggle")
    CAPTCHA_NOTICE = (By.CSS_SELECTOR, "div.captcha-notice")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["login"]
    
    def navigate(self):
        """Navigate to login page"""
        self.navigate_to(self.url)
    
    def enter_email(self, email):
        """Enter email address"""
        self.send_keys(self.EMAIL_INPUT, email)
    
    def enter_password(self, password):
        """Enter password"""
        self.send_keys(self.PASSWORD_INPUT, password)
    
    def click_login(self):
        """Click login button"""
        self.click(self.LOGIN_BUTTON)
    
    def click_forgot_password(self):
        """Click forgot password link"""
        self.click(self.FORGOT_PASSWORD_LINK)
    
    def click_signup(self):
        """Click signup link"""
        self.click(self.SIGNUP_LINK)
    
    def toggle_password_visibility(self):
        """Toggle password visibility"""
        self.click(self.PASSWORD_TOGGLE)
    
    def login(self, email, password):
        """Perform login with credentials"""
        self.enter_email(email)
        self.enter_password(password)
        self.click_login()
    
    def get_error_message(self):
        """Get error message text"""
        if self.is_element_visible(self.ERROR_MESSAGE):
            return self.get_text(self.ERROR_MESSAGE)
        return None
    
    def get_success_message(self):
        """Get success message text"""
        if self.is_element_visible(self.SUCCESS_MESSAGE):
            return self.get_text(self.SUCCESS_MESSAGE)
        return None
    
    def is_captcha_displayed(self):
        """Check if captcha notice is displayed"""
        return self.is_element_visible(self.CAPTCHA_NOTICE)
    
    def is_login_successful(self):
        """Check if login was successful by verifying redirect"""
        try:
            self.wait_for_url_contains("/list")
            return True
        except:
            return False
    
    def is_login_button_enabled(self):
        """Check if login button is enabled"""
        button = self.find_element(self.LOGIN_BUTTON)
        return button.is_enabled()
