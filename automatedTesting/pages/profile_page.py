"""
User Profile Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class ProfilePage(BasePage):
    """Page object for User Profile page"""
    
    # Locators - using more specific selectors
    BACK_BUTTON = (By.CSS_SELECTOR, "button.profile-back-btn")
    NEW_PASSWORD_INPUT = (By.CSS_SELECTOR, "input[placeholder*='New Password'], input[name='newPassword'], input.new-password")
    CONFIRM_PASSWORD_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Confirm'], input[name='confirmPassword'], input.confirm-password")
    PASSWORD_TOGGLE = (By.CSS_SELECTOR, "button.password-toggle-btn")
    UPDATE_PASSWORD_BUTTON = (By.CSS_SELECTOR, "button.save-btn, button[type='submit']")
    INVITE_EMAIL_INPUT = (By.CSS_SELECTOR, "input[type='email']")
    SEND_INVITATION_BUTTON = (By.XPATH, "//button[contains(text(), 'Send') or contains(text(), 'Invite')]")
    PASSWORD_ERROR = (By.CSS_SELECTOR, "p.password-error, .error-message, .text-danger")
    SUCCESS_MESSAGE = (By.CSS_SELECTOR, "div.profile-message.success, .toast-success")
    CONFIG_CARDS = (By.CSS_SELECTOR, "div.config-card")
    CONFIG_FORM = (By.CSS_SELECTOR, "div.config-form")
    # Alternative password inputs using index
    PASSWORD_INPUTS = (By.CSS_SELECTOR, "input[type='password']")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["profile"]
    
    def navigate(self):
        """Navigate to profile page"""
        self.navigate_to(self.url)
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
    
    def enter_new_password(self, password):
        """Enter new password"""
        try:
            self.send_keys(self.NEW_PASSWORD_INPUT, password)
        except:
            # Fallback: use first password input
            inputs = self.find_elements(self.PASSWORD_INPUTS)
            if inputs:
                inputs[0].clear()
                inputs[0].send_keys(password)
    
    def enter_confirm_password(self, password):
        """Enter confirm password"""
        try:
            self.send_keys(self.CONFIRM_PASSWORD_INPUT, password)
        except:
            # Fallback: use second password input
            inputs = self.find_elements(self.PASSWORD_INPUTS)
            if len(inputs) > 1:
                inputs[1].clear()
                inputs[1].send_keys(password)
    
    def toggle_password_visibility(self):
        """Toggle password visibility"""
        self.click(self.PASSWORD_TOGGLE)
    
    def click_update_password(self):
        """Click update password button"""
        self.click(self.UPDATE_PASSWORD_BUTTON)
    
    def change_password(self, new_password, confirm_password=None):
        """Change password"""
        self.enter_new_password(new_password)
        self.enter_confirm_password(confirm_password or new_password)
        self.click_update_password()
    
    def enter_invite_email(self, email):
        """Enter email to invite"""
        self.send_keys(self.INVITE_EMAIL_INPUT, email)
    
    def click_send_invitation(self):
        """Click send invitation button"""
        self.click(self.SEND_INVITATION_BUTTON)
    
    def invite_user(self, email):
        """Invite a user by email"""
        self.enter_invite_email(email)
        self.click_send_invitation()
    
    def get_password_error(self):
        """Get password error message"""
        if self.is_element_visible(self.PASSWORD_ERROR):
            return self.get_text(self.PASSWORD_ERROR)
        return None
    
    def is_password_updated(self):
        """Check if password was updated successfully"""
        toast = self.get_toast_message()
        return toast and "updated" in toast.lower()
    
    def is_invitation_sent(self):
        """Check if invitation was sent successfully"""
        toast = self.get_toast_message()
        return toast and "invitation" in toast.lower()
    
    def get_config_cards_count(self):
        """Get number of config cards"""
        return len(self.find_elements(self.CONFIG_CARDS))
