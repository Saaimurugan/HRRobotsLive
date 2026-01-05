"""
Signup Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class SignupPage(BasePage):
    """Page object for Signup page"""
    
    # Locators
    EMAIL_INPUT = (By.NAME, "email")
    PASSWORD_INPUT = (By.NAME, "password")
    CONFIRM_PASSWORD_INPUT = (By.NAME, "confirmPassword")
    CREATE_ACCOUNT_BUTTON = (By.CSS_SELECTOR, "button.login-btn")
    PASSWORD_TOGGLE = (By.CSS_SELECTOR, "button.password-toggle")
    EMAIL_ERROR = (By.CSS_SELECTOR, "span.field-error")
    PASSWORD_STRENGTH_BARS = (By.CSS_SELECTOR, "div.strength-bars")
    STRENGTH_LABEL = (By.CSS_SELECTOR, "span.strength-label")
    LOGIN_LINK = (By.CSS_SELECTOR, "a[href='/login']")
    SUCCESS_STATE = (By.CSS_SELECTOR, "div.success-state")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["signup"]
    
    def navigate(self):
        """Navigate to signup page"""
        self.navigate_to(self.url)
    
    def enter_email(self, email):
        """Enter email address"""
        self.send_keys(self.EMAIL_INPUT, email)
    
    def enter_password(self, password):
        """Enter password"""
        self.send_keys(self.PASSWORD_INPUT, password)
    
    def enter_confirm_password(self, password):
        """Enter confirm password"""
        self.send_keys(self.CONFIRM_PASSWORD_INPUT, password)
    
    def click_create_account(self):
        """Click create account button"""
        self.click(self.CREATE_ACCOUNT_BUTTON)
    
    def toggle_password_visibility(self):
        """Toggle password visibility"""
        self.click(self.PASSWORD_TOGGLE)
    
    def click_login_link(self):
        """Click login link"""
        self.click(self.LOGIN_LINK)
    
    def signup(self, email, password, confirm_password=None):
        """Perform signup with credentials"""
        self.enter_email(email)
        self.enter_password(password)
        self.enter_confirm_password(confirm_password or password)
        self.click_create_account()
    
    def get_email_error(self):
        """Get email error message"""
        if self.is_element_visible(self.EMAIL_ERROR):
            return self.get_text(self.EMAIL_ERROR)
        return None
    
    def get_password_strength_label(self):
        """Get password strength label"""
        if self.is_element_visible(self.STRENGTH_LABEL):
            return self.get_text(self.STRENGTH_LABEL)
        return None
    
    def is_signup_successful(self):
        """Check if signup was successful"""
        try:
            self.wait_for_url_contains("/signup-success")
            return True
        except:
            return self.is_element_visible(self.SUCCESS_STATE)
    
    def is_create_button_enabled(self):
        """Check if create account button is enabled"""
        button = self.find_element(self.CREATE_ACCOUNT_BUTTON)
        return button.is_enabled()
    
    def get_strength_bars_count(self):
        """Get number of active strength bars"""
        bars = self.find_elements((By.CSS_SELECTOR, "div.strength-bar.active"))
        return len(bars)
