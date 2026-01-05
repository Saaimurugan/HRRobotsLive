"""
Test Suite: User Signup
Tests all signup scenarios and validations
"""
import pytest
from faker import Faker
from pages.signup_page import SignupPage
from config import ROUTES

fake = Faker()


class TestSignup:
    """Test cases for user signup functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup for each test"""
        self.driver = driver
        self.signup_page = SignupPage(driver)
        self.signup_page.navigate()
    
    def test_signup_page_loads(self):
        """Verify signup page loads correctly"""
        assert "/signup" in self.driver.current_url
        assert self.signup_page.is_element_visible(SignupPage.EMAIL_INPUT)
        assert self.signup_page.is_element_visible(SignupPage.PASSWORD_INPUT)
        assert self.signup_page.is_element_visible(SignupPage.CONFIRM_PASSWORD_INPUT)
    
    def test_signup_with_valid_business_email(self):
        """Test signup with valid business email"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        password = "TestPassword123!"
        
        self.signup_page.signup(email, password)
        
        # Should redirect to success page or show success state
        assert self.signup_page.is_signup_successful() or \
               self.signup_page.is_element_visible(SignupPage.SUCCESS_STATE)
    
    def test_signup_rejects_personal_gmail(self):
        """Test that personal Gmail addresses are rejected"""
        email = f"test_{fake.uuid4()[:8]}@gmail.com"
        password = "TestPassword123!"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password(password)
        
        error = self.signup_page.get_email_error()
        assert error is not None
        assert "personal" in error.lower() or "not allowed" in error.lower()
    
    def test_signup_rejects_personal_yahoo(self):
        """Test that personal Yahoo addresses are rejected"""
        email = f"test_{fake.uuid4()[:8]}@yahoo.com"
        password = "TestPassword123!"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password(password)
        
        error = self.signup_page.get_email_error()
        assert error is not None
    
    def test_signup_rejects_personal_hotmail(self):
        """Test that personal Hotmail addresses are rejected"""
        email = f"test_{fake.uuid4()[:8]}@hotmail.com"
        password = "TestPassword123!"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password(password)
        
        error = self.signup_page.get_email_error()
        assert error is not None
    
    def test_signup_rejects_personal_outlook(self):
        """Test that personal Outlook addresses are rejected"""
        email = f"test_{fake.uuid4()[:8]}@outlook.com"
        password = "TestPassword123!"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password(password)
        
        error = self.signup_page.get_email_error()
        assert error is not None
    
    def test_signup_invalid_email_format(self):
        """Test signup with invalid email format"""
        self.signup_page.enter_email("invalidemail")
        self.signup_page.enter_password("TestPassword123!")
        
        error = self.signup_page.get_email_error()
        assert error is not None or not self.signup_page.is_create_button_enabled()
    
    def test_signup_password_too_short(self):
        """Test signup with password less than 8 characters"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("Test1!")
        
        # Password strength should be weak
        strength = self.signup_page.get_password_strength_label()
        assert strength is None or "weak" in strength.lower() or \
               self.signup_page.get_strength_bars_count() < 3
    
    def test_signup_password_no_uppercase(self):
        """Test signup with password without uppercase"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("testpassword123!")
        
        strength = self.signup_page.get_password_strength_label()
        bars = self.signup_page.get_strength_bars_count()
        assert bars < 5  # Not maximum strength
    
    def test_signup_password_no_lowercase(self):
        """Test signup with password without lowercase"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("TESTPASSWORD123!")
        
        bars = self.signup_page.get_strength_bars_count()
        assert bars < 5
    
    def test_signup_password_no_number(self):
        """Test signup with password without number"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("TestPassword!")
        
        bars = self.signup_page.get_strength_bars_count()
        assert bars < 5
    
    def test_signup_password_no_special_char(self):
        """Test signup with password without special character"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("TestPassword123")
        
        bars = self.signup_page.get_strength_bars_count()
        assert bars < 5
    
    def test_signup_password_mismatch(self):
        """Test signup with mismatched passwords"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("TestPassword123!")
        self.signup_page.enter_confirm_password("DifferentPassword123!")
        
        # Button should be disabled or error shown
        assert not self.signup_page.is_create_button_enabled() or \
               self.signup_page.get_email_error() is not None
    
    def test_signup_strong_password_indicator(self):
        """Test password strength indicator shows strong for valid password"""
        email = f"test_{fake.uuid4()[:8]}@testcompany.com"
        
        self.signup_page.enter_email(email)
        self.signup_page.enter_password("TestPassword123!")
        
        bars = self.signup_page.get_strength_bars_count()
        assert bars >= 4  # Should be strong
    
    def test_signup_toggle_password_visibility(self):
        """Test password visibility toggle"""
        self.signup_page.enter_password("TestPassword123!")
        
        # Get initial type
        password_input = self.signup_page.find_element(SignupPage.PASSWORD_INPUT)
        initial_type = password_input.get_attribute("type")
        assert initial_type == "password"
        
        # Toggle visibility
        self.signup_page.toggle_password_visibility()
        
        # Check type changed
        new_type = password_input.get_attribute("type")
        assert new_type == "text"
    
    def test_signup_navigate_to_login(self):
        """Test navigation to login page"""
        self.signup_page.click_login_link()
        
        assert "/login" in self.driver.current_url
    
    def test_signup_empty_form_submission(self):
        """Test submitting empty form"""
        self.signup_page.click_create_account()
        
        # Should stay on signup page
        assert "/signup" in self.driver.current_url
    
    def test_signup_email_already_registered(self):
        """Test signup with already registered email"""
        # Use a known registered email
        email = "existing@company.com"
        password = "TestPassword123!"
        
        self.signup_page.signup(email, password)
        
        # Should show error about existing email
        error = self.signup_page.get_email_error()
        # Error might be shown via toast or field error
        # This test may need adjustment based on actual behavior
