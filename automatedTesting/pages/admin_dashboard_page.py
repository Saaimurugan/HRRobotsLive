"""
Admin Dashboard Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class AdminDashboardPage(BasePage):
    """Page object for Admin Dashboard page"""
    
    # Locators - More generic selectors for admin dashboard
    ADMIN_DASHBOARD_TITLE = (By.CSS_SELECTOR, "h1, h2, .page-title")
    STATS_CARDS = (By.CSS_SELECTOR, ".card, .stat-card, .stats, .metric")
    CHARTS_SECTION = (By.CSS_SELECTOR, ".chart, .graph, canvas, svg")
    DATA_TABLE = (By.CSS_SELECTOR, "table, .data-table, .list")
    FILTER_CONTROLS = (By.CSS_SELECTOR, "select, .filter, .dropdown")
    LOADING_SPINNER = (By.CSS_SELECTOR, ".loading, .spinner, .loader")
    ERROR_MESSAGE = (By.CSS_SELECTOR, ".error, .alert-danger, .error-message")
    CONTENT_AREA = (By.CSS_SELECTOR, ".content, .main-content, .dashboard-content")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = f"{ROUTES['dashboard']}/admin"  # Assuming admin dashboard is at /list/admin
    
    def navigate(self):
        """Navigate to admin dashboard page"""
        self.navigate_to(self.url)
        self.wait_for_loading()
    
    def is_admin_dashboard_loaded(self):
        """Check if admin dashboard is loaded"""
        return self.is_element_visible(self.ADMIN_DASHBOARD_TITLE, timeout=10) and \
               "/admin" in self.driver.current_url
    
    def has_admin_content(self):
        """Check if page has admin-specific content"""
        return (self.is_element_visible(self.STATS_CARDS, timeout=5) or
                self.is_element_visible(self.CHARTS_SECTION, timeout=5) or
                self.is_element_visible(self.DATA_TABLE, timeout=5) or
                self.is_element_visible(self.CONTENT_AREA, timeout=5))
    
    def get_page_title(self):
        """Get page title"""
        if self.is_element_visible(self.ADMIN_DASHBOARD_TITLE):
            return self.get_text(self.ADMIN_DASHBOARD_TITLE)
        return None
    
    def has_filter_controls(self):
        """Check if page has filter controls"""
        return self.is_element_visible(self.FILTER_CONTROLS, timeout=5)
    
    def has_charts(self):
        """Check if page has charts"""
        return self.is_element_visible(self.CHARTS_SECTION, timeout=5)
    
    def has_data_tables(self):
        """Check if page has data tables"""
        return self.is_element_visible(self.DATA_TABLE, timeout=5)
    
    def has_loading_error(self):
        """Check if there's a loading error"""
        return self.is_element_visible(self.ERROR_MESSAGE, timeout=5)