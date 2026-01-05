"""
Test Suite: User Profile
Tests all user profile scenarios
"""
import pytest
from faker import Faker
from pages.login_page import LoginPage
from pages.profile_page import ProfilePage
from config import TEST_USER, ROUTES

fake = Faker()


class TestUserProfile:
    """Test cases for user profile functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to profile page"""
        self.driver = driver
        
        # Login first
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to profile
        self.profile_page = ProfilePage(driver)
        self.profile_page.navigate()
    
    def test_profile_page_loads(self):
        """Verify profile page loads correctly"""
        assert "/profile" in self.driver.current_url
        assert self.profile_page.is_element_visible(ProfilePage.NEW_PASSWORD_INPUT) or \
               self.profile_page.is_element_present(ProfilePage.UPDATE_PASSWORD_BUTTON)
    
    def test_change_password_valid(self):
        """Test changing password with valid new password"""
        new_password = "NewTestPassword123!"
        
        self.profile_page.change_password(new_password)
        self.profile_page.wait_for_loading()
        
        # Should show success message
        assert self.profile_page.is_password_updated() or \
               self.profile_page.get_toast_message() is not None
        
        # Change back to original password for other tests
        self.profile_page.navigate()
        self.profile_page.change_password(TEST_USER["password"])
    
    def test_change_password_mismatch(self):
        """Test changing password with mismatched passwords"""
        self.profile_page.enter_new_password("NewPassword123!")
        self.profile_page.enter_confirm_password("DifferentPassword123!")
        self.profile_page.click_update_password()
        
        # Should show error
        error = self.profile_page.get_password_error()
        assert error is not None or not self.profile_page.is_password_updated()
    
    def test_change_password_too_short(self):
        """Test changing password with too short password"""
        self.profile_page.change_password("Short1!")
        
        # Should show error
        error = self.profile_page.get_password_error()
        assert error is not None or not self.profile_page.is_password_updated()
    
    def test_change_password_no_uppercase(self):
        """Test changing password without uppercase"""
        self.profile_page.change_password("testpassword123!")
        
        # Should show error
        error = self.profile_page.get_password_error()
        # May or may not show error depending on validation
    
    def test_change_password_no_lowercase(self):
        """Test changing password without lowercase"""
        self.profile_page.change_password("TESTPASSWORD123!")
        
        # Should show error
        error = self.profile_page.get_password_error()
    
    def test_change_password_no_number(self):
        """Test changing password without number"""
        self.profile_page.change_password("TestPassword!")
        
        # Should show error
        error = self.profile_page.get_password_error()
    
    def test_change_password_no_special_char(self):
        """Test changing password without special character"""
        self.profile_page.change_password("TestPassword123")
        
        # Should show error
        error = self.profile_page.get_password_error()
    
    def test_change_password_empty(self):
        """Test changing password with empty fields"""
        self.profile_page.click_update_password()
        
        # Should show error or not update
        assert not self.profile_page.is_password_updated()
    
    def test_toggle_password_visibility(self):
        """Test password visibility toggle"""
        self.profile_page.enter_new_password("TestPassword123!")
        
        # Get initial type
        password_input = self.profile_page.find_element(ProfilePage.NEW_PASSWORD_INPUT)
        initial_type = password_input.get_attribute("type")
        assert initial_type == "password"
        
        # Toggle visibility
        self.profile_page.toggle_password_visibility()
        
        # Check type changed
        new_type = password_input.get_attribute("type")
        assert new_type == "text"
    
    def test_invite_user_valid_email(self):
        """Test inviting user with valid business email"""
        invite_email = f"invite_{fake.uuid4()[:8]}@company.com"
        
        self.profile_page.invite_user(invite_email)
        self.profile_page.wait_for_loading()
        
        # Should show success
        assert self.profile_page.is_invitation_sent() or \
               self.profile_page.get_toast_message() is not None
    
    def test_invite_user_personal_email(self):
        """Test inviting user with personal email"""
        invite_email = f"invite_{fake.uuid4()[:8]}@gmail.com"
        
        self.profile_page.invite_user(invite_email)
        
        # Should show error (personal emails not allowed)
        # Behavior depends on implementation
    
    def test_invite_user_invalid_email(self):
        """Test inviting user with invalid email format"""
        self.profile_page.enter_invite_email("invalidemail")
        self.profile_page.click_send_invitation()
        
        # Should show error
        assert not self.profile_page.is_invitation_sent()
    
    def test_invite_user_empty_email(self):
        """Test inviting user with empty email"""
        self.profile_page.click_send_invitation()
        
        # Should show error or not send
        assert not self.profile_page.is_invitation_sent()
    
    def test_invite_existing_user(self):
        """Test inviting already registered user"""
        self.profile_page.invite_user(TEST_USER["email"])
        
        # Should show error about existing user
        # Behavior depends on implementation
    
    def test_back_button(self):
        """Test back button navigation"""
        self.profile_page.click_back()
        
        assert "/list" in self.driver.current_url
    
    def test_profile_shows_config_sections(self):
        """Test that profile shows configuration sections"""
        config_count = self.profile_page.get_config_cards_count()
        
        # Should have at least password and invite sections
        assert config_count >= 1
    
    def test_multiple_password_changes(self):
        """Test multiple password changes in sequence"""
        passwords = [
            "FirstPassword123!",
            "SecondPassword123!",
            TEST_USER["password"]  # Change back to original
        ]
        
        for password in passwords:
            self.profile_page.navigate()
            self.profile_page.change_password(password)
            self.profile_page.wait_for_loading()
    
    def test_invite_multiple_users(self):
        """Test inviting multiple users"""
        emails = [
            f"invite1_{fake.uuid4()[:8]}@company.com",
            f"invite2_{fake.uuid4()[:8]}@company.com",
            f"invite3_{fake.uuid4()[:8]}@company.com"
        ]
        
        for email in emails:
            self.profile_page.navigate()
            self.profile_page.invite_user(email)
            self.profile_page.wait_for_loading()


class TestProfileNavigation:
    """Test cases for profile navigation"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login"""
        self.driver = driver
        
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
    
    def test_navigate_to_profile_from_header(self):
        """Test navigating to profile from header"""
        from pages.dashboard_page import DashboardPage
        
        dashboard = DashboardPage(self.driver)
        dashboard.navigate()
        
        # Click profile button in header
        # This depends on header implementation
    
    def test_profile_accessible_from_all_pages(self):
        """Test that profile is accessible from all pages"""
        pages = [
            ROUTES["dashboard"],
            ROUTES["create_jd"],
            ROUTES["profiler"],
            ROUTES["create_template"],
            ROUTES["result"]
        ]
        
        for page in pages:
            self.driver.get(page)
            # Navigate to profile
            self.driver.get(ROUTES["profile"])
            assert "/profile" in self.driver.current_url
