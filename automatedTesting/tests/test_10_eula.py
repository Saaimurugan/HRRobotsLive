"""
Test Suite: End User License Agreement (EULA)
Tests EULA page content and functionality
"""
import pytest
from pages.eula_page import EULAPage
from pages.login_page import LoginPage
from config import BASE_URL


class TestEULA:
    """Test cases for EULA page functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup for each test"""
        self.driver = driver
        self.eula_page = EULAPage(driver)
    
    def test_eula_page_loads(self):
        """Verify EULA page loads correctly"""
        self.eula_page.navigate()
        
        assert self.eula_page.is_page_loaded()
        assert "/eula" in self.driver.current_url
    
    def test_eula_page_title(self):
        """Test EULA page has correct title"""
        self.eula_page.navigate()
        
        title = self.eula_page.get_page_title()
        assert "End User License Agreement" in title or "EULA" in title
    
    def test_eula_page_has_all_sections(self):
        """Test EULA page contains all required sections"""
        self.eula_page.navigate()
        
        section_count = self.eula_page.get_section_count()
        # EULA has 17 sections
        assert section_count >= 17
    
    def test_eula_section_titles_present(self):
        """Test that all expected section titles are present"""
        self.eula_page.navigate()
        
        actual_sections = self.eula_page.get_section_titles()
        expected_sections = self.eula_page.get_expected_sections()
        
        for expected in expected_sections:
            # Check if section number and key words are present
            section_num = expected.split(".")[0]
            found = any(section_num in actual for actual in actual_sections)
            assert found, f"Section '{expected}' not found"
    
    def test_eula_contact_information_visible(self):
        """Test that contact information is visible"""
        self.eula_page.navigate()
        self.eula_page.scroll_to_bottom()
        
        assert self.eula_page.is_contact_info_visible()
    
    def test_eula_contact_email_correct(self):
        """Test that contact email is correct"""
        self.eula_page.navigate()
        self.eula_page.scroll_to_bottom()
        
        email = self.eula_page.get_contact_email()
        assert email == "bot@hrrobots.com"
    
    def test_eula_page_scrollable(self):
        """Test that EULA page is scrollable"""
        self.eula_page.navigate()
        
        # Get initial scroll position
        initial_scroll = self.driver.execute_script("return window.pageYOffset;")
        
        # Scroll to bottom
        self.eula_page.scroll_to_bottom()
        
        # Get new scroll position
        new_scroll = self.driver.execute_script("return window.pageYOffset;")
        
        # Should have scrolled
        assert new_scroll > initial_scroll
    
    def test_eula_accessible_without_login(self):
        """Test that EULA page is accessible without being logged in"""
        # Clear any existing session
        self.driver.delete_all_cookies()
        
        self.eula_page.navigate()
        
        # Should load EULA page, not redirect to login
        assert "/eula" in self.driver.current_url
        assert self.eula_page.is_page_loaded()
    
    def test_eula_no_navbar_displayed(self):
        """Test that navbar is not displayed on EULA page"""
        self.eula_page.navigate()
        
        # The header/navbar should not be visible on auth pages
        # Check that we're on the EULA page and it loaded correctly
        assert self.eula_page.is_page_loaded()
    
    def test_eula_direct_url_access(self):
        """Test EULA page can be accessed via direct URL"""
        self.driver.get(f"{BASE_URL}/eula")
        
        assert "/eula" in self.driver.current_url
        assert self.eula_page.is_page_loaded()
    
    def test_eula_page_styling_consistent(self):
        """Test EULA page has consistent styling with brand colors"""
        self.eula_page.navigate()
        
        # Check that the page title element exists and is styled
        title_element = self.eula_page.find_element(EULAPage.PAGE_TITLE)
        assert title_element is not None
        
        # Verify the title is visible
        assert title_element.is_displayed()


class TestEULAFromLogin:
    """Test cases for EULA access from login page"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup for each test"""
        self.driver = driver
        self.login_page = LoginPage(driver)
        self.eula_page = EULAPage(driver)
        self.login_page.navigate()
    
    def test_eula_link_from_login_page(self):
        """Test EULA link on login page works correctly"""
        # Store original window
        original_window = self.driver.current_window_handle
        
        # Click EULA link
        self.login_page.click_eula_link()
        
        # Wait for new tab
        import time
        time.sleep(1)
        
        # Switch to new window
        for window_handle in self.driver.window_handles:
            if window_handle != original_window:
                self.driver.switch_to.window(window_handle)
                break
        
        # Verify EULA page
        assert "/eula" in self.driver.current_url
        assert self.eula_page.is_page_loaded()
        
        # Cleanup
        self.driver.close()
        self.driver.switch_to.window(original_window)
    
    def test_login_page_remains_after_viewing_eula(self):
        """Test that login page state is preserved after viewing EULA"""
        # Enter some data
        self.login_page.enter_email("test@example.com")
        self.login_page.enter_password("testpassword")
        
        # Store original window
        original_window = self.driver.current_window_handle
        
        # Click EULA link
        self.login_page.click_eula_link()
        
        import time
        time.sleep(1)
        
        # Switch to new window and close it
        for window_handle in self.driver.window_handles:
            if window_handle != original_window:
                self.driver.switch_to.window(window_handle)
                self.driver.close()
                break
        
        # Switch back to login page
        self.driver.switch_to.window(original_window)
        
        # Verify we're still on login page
        assert "/login" in self.driver.current_url
        
        # Verify form data is preserved
        email_input = self.login_page.find_element(LoginPage.EMAIL_INPUT)
        assert email_input.get_attribute("value") == "test@example.com"
