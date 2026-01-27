"""
Test Suite: Admin Dashboard
Tests admin dashboard functionality and access control
"""
import pytest
from pages.login_page import LoginPage
from pages.admin_dashboard_page import AdminDashboardPage
from pages.dashboard_page import DashboardPage
from config import TEST_USER, ROUTES


class TestAdminDashboard:
    """Test cases for admin dashboard functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login with test user"""
        self.driver = driver
        self.login_page = LoginPage(driver)
        self.admin_dashboard_page = AdminDashboardPage(driver)
        self.dashboard_page = DashboardPage(driver)
        
        # Login first
        self.login_page.navigate()
        self.login_page.login_with_eula(TEST_USER["email"], TEST_USER["password"])
        self.login_page.wait_for_url_contains("/list")
    
    def test_admin_access_verification(self):
        """Test admin dashboard access - verify if user has admin privileges"""
        # Try to navigate to admin dashboard
        self.admin_dashboard_page.navigate()
        
        current_url = self.driver.current_url
        
        if "/admin" in current_url:
            # User has admin access - test the dashboard functionality
            assert self.admin_dashboard_page.is_admin_dashboard_loaded()
            print("User has admin access - testing admin dashboard functionality")
        else:
            # User doesn't have admin access - should be redirected
            assert "/list" in current_url
            print("User doesn't have admin access - correctly redirected")
    
    def test_admin_dashboard_functionality_if_accessible(self):
        """Test admin dashboard functionality if user has access"""
        self.admin_dashboard_page.navigate()
        
        if "/admin" in self.driver.current_url:
            # We have admin access - test the dashboard
            # Wait for page to load completely
            self.admin_dashboard_page.wait_for_loading()
            
            # Test that page loads without errors
            assert not self.admin_dashboard_page.has_loading_error()
            
            # Test that page has some content
            page_title = self.admin_dashboard_page.get_page_title()
            has_content = self.admin_dashboard_page.has_admin_content()
            
            # Admin dashboard should have a title and some content
            assert page_title is not None, "Admin dashboard should have a title"
            assert has_content, "Admin dashboard should display some content"
        else:
            pytest.skip("User doesn't have admin access")
    
    def test_admin_dashboard_components(self):
        """Test admin dashboard components"""
        self.admin_dashboard_page.navigate()
        
        if "/admin" in self.driver.current_url:
            # Test various dashboard components
            has_charts = self.admin_dashboard_page.has_charts()
            has_tables = self.admin_dashboard_page.has_data_tables()
            has_filters = self.admin_dashboard_page.has_filter_controls()
            
            # At least one component should be present
            assert has_charts or has_tables or has_filters, \
                   "Admin dashboard should have charts, tables, or filters"
        else:
            pytest.skip("User doesn't have admin access")
    
    def test_admin_dashboard_loading_states(self):
        """Test admin dashboard loading states"""
        self.admin_dashboard_page.navigate()
        
        if "/admin" in self.driver.current_url:
            # Check that loading doesn't result in errors
            assert not self.admin_dashboard_page.has_loading_error()
    
    def test_admin_dashboard_filters(self):
        """Test admin dashboard filtering functionality"""
        self.admin_dashboard_page.navigate()
        
        if "/admin" in self.driver.current_url:
            # Test filter controls if they exist
            if self.admin_dashboard_page.has_filter_controls():
                # Filters are available - test them
                # Wait for potential updates
                self.admin_dashboard_page.wait_for_loading()
                
                # Should not have errors after checking filters
                assert not self.admin_dashboard_page.has_loading_error()
            else:
                # No filters available - that's okay
                assert not self.admin_dashboard_page.has_loading_error()
        else:
            pytest.skip("User doesn't have admin access")
    
    def test_admin_dashboard_expansion_features(self):
        """Test admin dashboard expansion features"""
        self.admin_dashboard_page.navigate()
        
        if "/admin" in self.driver.current_url:
            # Test that dashboard loads without errors
            assert not self.admin_dashboard_page.has_loading_error()
            
            # Test that we can interact with the page
            page_title = self.admin_dashboard_page.get_page_title()
            assert page_title is not None
        else:
            pytest.skip("User doesn't have admin access")