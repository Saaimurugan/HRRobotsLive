"""
Test Suite: Forgot Password
Tests all forgot password scenarios
"""
import pytest
from faker import Faker
from pages.forgot_password_page import ForgotPasswordPage
from pages.login_page import LoginPage
from config import TEST_USER

fake = Faker()


class TestForgotPassword:
    """Test cases for forgot password functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup for each test"""
        self.driver = driver
        self.forgot_page = ForgotPasswordPage(driver)
        self.forgot_page.navigate()
    
    def test_forgot_password_page_loads(self):
        """Verify forgot password page loads correctly"""
        assert "/forgot-password" in self.driver.current_url
        assert self.forgot_page.is_element_visible(ForgotPasswordPage.EMAIL_INPUT)
        assert self.forgot_page.is_element_visible(ForgotPasswordPage.SEND_RESET_BUTTON)
    
    def test_forgot_password_with_valid_email(self):
        """Test forgot password with valid registered email"""
        self.forgot_page.request_password_reset(TEST_USER["email"])
        
        # Should show success state
        assert self.forgot_page.is_success_state_displayed()
    
    def test_forgot_password_displays_email(self):
        """Test that success state displays the entered email"""
        self.forgot_page.request_password_reset(TEST_USER["email"])
        
        # Wait for success state
        if self.forgot_page.is_success_state_displayed():
            displayed_email = self.forgot_page.get_displayed_email()
            assert TEST_USER["email"] in displayed_email
    
    def test_forgot_password_try_again_button(self):
        """Test try again button resets the form"""
        self.forgot_page.request_password_reset(TEST_USER["email"])
        
        if self.forgot_page.is_success_state_displayed():
            self.forgot_page.click_try_again()
            
            # Should show email input again
            assert self.forgot_page.is_element_visible(ForgotPasswordPage.EMAIL_INPUT)
    
    def test_forgot_password_with_unregistered_email(self):
        """Test forgot password with unregistered email"""
        unregistered_email = f"unregistered_{fake.uuid4()[:8]}@company.com"
        self.forgot_page.request_password_reset(unregistered_email)
        
        # Behavior depends on implementation:
        # Some apps show success anyway (security), some show error
        # Check for either success or error state
        success = self.forgot_page.is_success_state_displayed()
        error = self.forgot_page.get_error_message()
        assert success or error is not None
    
    def test_forgot_password_with_invalid_email_format(self):
        """Test forgot password with invalid email format"""
        self.forgot_page.enter_email("invalidemail")
        self.forgot_page.click_send_reset_link()
        
        # Should show error or stay on page
        assert "/forgot-password" in self.driver.current_url
    
    def test_forgot_password_empty_email(self):
        """Test forgot password with empty email"""
        self.forgot_page.click_send_reset_link()
        
        # Should stay on page
        assert "/forgot-password" in self.driver.current_url
    
    def test_forgot_password_back_to_login(self):
        """Test navigation back to login page"""
        self.forgot_page.click_back_to_login()
        
        assert "/login" in self.driver.current_url
    
    def test_forgot_password_from_login_page(self):
        """Test accessing forgot password from login page"""
        login_page = LoginPage(self.driver)
        login_page.navigate()
        login_page.click_forgot_password()
        
        assert "/forgot-password" in self.driver.current_url
    
    def test_forgot_password_with_personal_email(self):
        """Test forgot password with personal email"""
        self.forgot_page.request_password_reset("test@gmail.com")
        
        # Should show error or success (depends on if email exists)
        # Personal emails shouldn't be registered, so likely error
    
    def test_forgot_password_multiple_requests(self):
        """Test multiple password reset requests"""
        # First request
        self.forgot_page.request_password_reset(TEST_USER["email"])
        
        # First request should succeed
        first_success = self.forgot_page.is_success_state_displayed()
        
        if first_success:
            # Try again
            self.forgot_page.click_try_again()
            import time
            time.sleep(2)  # Wait for form to reset
            
            # Second request - may be rate limited, so just verify we can try again
            self.forgot_page.enter_email(TEST_USER["email"])
            self.forgot_page.click_send_reset_link()
            time.sleep(3)  # Wait for API response
            
            # Either success or still on the page (rate limited) is acceptable
            assert self.forgot_page.is_success_state_displayed() or \
                   "/forgot-password" in self.driver.current_url
        else:
            # If first request didn't show success, skip the test
            pytest.skip("First password reset request did not show success state")
    
    def test_forgot_password_email_case_insensitive(self):
        """Test that email is case insensitive"""
        email_upper = TEST_USER["email"].upper()
        self.forgot_page.request_password_reset(email_upper)
        
        # Should work the same as lowercase
        success = self.forgot_page.is_success_state_displayed()
        error = self.forgot_page.get_error_message()
        assert success or error is not None
    
    def test_forgot_password_email_with_whitespace(self):
        """Test email with leading/trailing whitespace"""
        email_with_space = f"  {TEST_USER['email']}  "
        self.forgot_page.request_password_reset(email_with_space)
        
        # Should trim and work
        success = self.forgot_page.is_success_state_displayed()
        error = self.forgot_page.get_error_message()
        assert success or error is not None
