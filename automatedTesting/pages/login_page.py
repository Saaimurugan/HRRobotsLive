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
    
    # EULA Locators
    EULA_CHECKBOX = (By.CSS_SELECTOR, "input.eula-input")
    EULA_CHECKBOX_CONTAINER = (By.CSS_SELECTOR, "div.eula-checkbox")
    EULA_LABEL = (By.CSS_SELECTOR, "label.eula-label")
    EULA_LINK = (By.CSS_SELECTOR, "a.eula-link")
    
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
    
    def login_with_eula(self, email, password, accept_eula=True):
        """Perform login with credentials and EULA acceptance"""
        self.enter_email(email)
        self.enter_password(password)
        if accept_eula:
            self.accept_eula()
        self.click_login()
    
    def accept_eula(self):
        """Accept the EULA checkbox"""
        checkbox = self.find_element(self.EULA_CHECKBOX)
        if not checkbox.is_selected():
            self.click(self.EULA_CHECKBOX)
    
    def uncheck_eula(self):
        """Uncheck the EULA checkbox"""
        checkbox = self.find_element(self.EULA_CHECKBOX)
        if checkbox.is_selected():
            self.click(self.EULA_CHECKBOX)
    
    def is_eula_checkbox_visible(self):
        """Check if EULA checkbox is visible"""
        return self.is_element_visible(self.EULA_CHECKBOX)
    
    def is_eula_checkbox_checked(self):
        """Check if EULA checkbox is checked"""
        checkbox = self.find_element(self.EULA_CHECKBOX)
        return checkbox.is_selected()
    
    def click_eula_link(self):
        """Click the EULA link to open EULA page"""
        self.click(self.EULA_LINK)
    
    def get_eula_link_href(self):
        """Get the href attribute of the EULA link"""
        link = self.find_element(self.EULA_LINK)
        return link.get_attribute("href")
    
    def get_eula_link_target(self):
        """Get the target attribute of the EULA link"""
        link = self.find_element(self.EULA_LINK)
        return link.get_attribute("target")
    
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
