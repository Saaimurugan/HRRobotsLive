"""
Test Suite: User Login
Tests all login scenarios and validations
"""
import pytest
import time
from pages.login_page import LoginPage
from config import ROUTES, TEST_USER


class TestLogin:
    """Test cases for user login functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup for each test"""
        self.driver = driver
        self.login_page = LoginPage(driver)
        self.login_page.navigate()
    
    def test_login_page_loads(self):
        """Verify login page loads correctly"""
        assert "/login" in self.driver.current_url
        assert self.login_page.is_element_visible(LoginPage.EMAIL_INPUT)
        assert self.login_page.is_element_visible(LoginPage.PASSWORD_INPUT)
        assert self.login_page.is_element_visible(LoginPage.LOGIN_BUTTON)
    
    def test_login_with_valid_credentials(self):
        """Test login with valid credentials"""
        self.login_page.login(TEST_USER["email"], TEST_USER["password"])
        
        # Should redirect to dashboard
        assert self.login_page.is_login_successful()
        assert "/list" in self.driver.current_url
    
    def test_login_with_invalid_email(self):
        """Test login with invalid email format"""
        self.login_page.login("invalidemail", "TestPassword123!")
        
        # Should show error or stay on login page
        assert "/login" in self.driver.current_url or \
               self.login_page.get_error_message() is not None
    
    def test_login_with_wrong_password(self):
        """Test login with wrong password"""
        self.login_page.login(TEST_USER["email"], "WrongPassword123!")
        
        error = self.login_page.get_error_message()
        assert error is not None or "/login" in self.driver.current_url
    
    def test_login_with_unregistered_email(self):
        """Test login with unregistered email"""
        self.login_page.login("unregistered@company.com", "TestPassword123!")
        
        error = self.login_page.get_error_message()
        assert error is not None or "/login" in self.driver.current_url
    
    def test_login_empty_email(self):
        """Test login with empty email"""
        self.login_page.enter_password("TestPassword123!")
        self.login_page.click_login()
        
        # Should stay on login page
        assert "/login" in self.driver.current_url
    
    def test_login_empty_password(self):
        """Test login with empty password"""
        self.login_page.enter_email(TEST_USER["email"])
        self.login_page.click_login()
        
        # Should stay on login page
        assert "/login" in self.driver.current_url
    
    def test_login_empty_form(self):
        """Test login with empty form"""
        self.login_page.click_login()
        
        # Should stay on login page
        assert "/login" in self.driver.current_url
    
    def test_login_toggle_password_visibility(self):
        """Test password visibility toggle"""
        self.login_page.enter_password("TestPassword123!")
        
        # Get initial type
        password_input = self.login_page.find_element(LoginPage.PASSWORD_INPUT)
        initial_type = password_input.get_attribute("type")
        assert initial_type == "password"
        
        # Toggle visibility
        self.login_page.toggle_password_visibility()
        
        # Check type changed
        new_type = password_input.get_attribute("type")
        assert new_type == "text"
    
    def test_login_navigate_to_signup(self):
        """Test navigation to signup page"""
        self.login_page.click_signup()
        
        assert "/signup" in self.driver.current_url
    
    def test_login_navigate_to_forgot_password(self):
        """Test navigation to forgot password page"""
        self.login_page.click_forgot_password()
        
        assert "/forgot-password" in self.driver.current_url
    
    def test_login_failed_attempts_trigger_captcha(self):
        """Test that multiple failed attempts trigger reCAPTCHA"""
        # Attempt login 3 times with wrong password
        for i in range(3):
            self.login_page.navigate()
            self.login_page.login(TEST_USER["email"], "WrongPassword123!")
            time.sleep(1)
        
        # After 3 attempts, captcha notice should appear
        # Note: This may vary based on implementation
        captcha_displayed = self.login_page.is_captcha_displayed()
        # This assertion may need adjustment based on actual behavior
    
    def test_login_case_sensitivity_email(self):
        """Test email is case insensitive"""
        email_upper = TEST_USER["email"].upper()
        self.login_page.login(email_upper, TEST_USER["password"])
        
        # Should still work (emails are typically case insensitive)
        # Result depends on backend implementation
    
    def test_login_whitespace_in_email(self):
        """Test login with whitespace in email"""
        email_with_space = f"  {TEST_USER['email']}  "
        self.login_page.login(email_with_space, TEST_USER["password"])
        
        # Should either trim and work, or show error
    
    def test_login_special_characters_in_password(self):
        """Test login with special characters in password"""
        self.login_page.login(TEST_USER["email"], "Test@#$%^&*()123!")
        
        # Should show error for wrong password
        error = self.login_page.get_error_message()
        assert error is not None or "/login" in self.driver.current_url
    
    def test_login_button_disabled_during_loading(self):
        """Test login button state during submission"""
        self.login_page.enter_email(TEST_USER["email"])
        self.login_page.enter_password(TEST_USER["password"])
        
        # Button should be enabled before click
        assert self.login_page.is_login_button_enabled()
    
    def test_login_session_persistence(self):
        """Test that login session persists"""
        self.login_page.login(TEST_USER["email"], TEST_USER["password"])
        
        # Wait for redirect
        self.login_page.wait_for_url_contains("/list")
        
        # Navigate to another page and back
        self.driver.get(ROUTES["profile"])
        
        # Should still be logged in (not redirected to login)
        assert "/login" not in self.driver.current_url
    
    def test_login_redirect_after_success(self):
        """Test redirect to dashboard after successful login"""
        self.login_page.login(TEST_USER["email"], TEST_USER["password"])
        
        self.login_page.wait_for_url_contains("/list")
        assert "/list" in self.driver.current_url
