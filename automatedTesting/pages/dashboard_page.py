"""
Dashboard Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class DashboardPage(BasePage):
    """Page object for Dashboard page"""
    
    # Locators
    CREATE_JD_CARD = (By.XPATH, "//div[contains(@class, 'card') and contains(., 'Create JD')]")
    PROFILER_CARD = (By.XPATH, "//div[contains(@class, 'card') and contains(., 'Candidate Profiler')]")
    SCREENING_TEST_CARD = (By.XPATH, "//div[contains(@class, 'card') and contains(., 'Create Template')]")
    RESULTS_CARD = (By.XPATH, "//div[contains(@class, 'card') and contains(., 'Results')]")
    
    # Header Navigation
    HOME_BUTTON = (By.CSS_SELECTOR, "button svg")
    PROFILE_BUTTON = (By.XPATH, "//button[contains(@class, 'profile') or .//svg]")
    LOGOUT_BUTTON = (By.XPATH, "//button[contains(@class, 'logout') or .//svg]")
    
    # Template Cards
    TEMPLATE_CARDS = (By.CSS_SELECTOR, "div.template-card")
    TEMPLATE_EDIT_BUTTON = (By.XPATH, ".//button[contains(@class, 'delete-button')][1]")
    TEMPLATE_DELETE_BUTTON = (By.XPATH, ".//button[contains(@class, 'delete-button')][2]")
    TEMPLATE_ASSIGN_BUTTON = (By.XPATH, ".//button[contains(@class, 'delete-button')][3]")
    TEMPLATE_CONFIG_BUTTON = (By.XPATH, ".//button[contains(@class, 'delete-button')][4]")
    
    # Empty State
    EMPTY_STATE = (By.CSS_SELECTOR, "div.empty-state")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["dashboard"]
    
    def navigate(self):
        """Navigate to dashboard"""
        self.navigate_to(self.url)
    
    def click_create_jd(self):
        """Click Create JD card"""
        card = self.find_element(self.CREATE_JD_CARD)
        button = card.find_element(By.TAG_NAME, "button")
        button.click()
    
    def click_candidate_profiler(self):
        """Click Candidate Profiler card"""
        card = self.find_element(self.PROFILER_CARD)
        button = card.find_element(By.TAG_NAME, "button")
        button.click()
    
    def click_screening_test(self):
        """Click Create Template card"""
        card = self.find_element(self.SCREENING_TEST_CARD)
        button = card.find_element(By.TAG_NAME, "button")
        button.click()
    
    def click_results(self):
        """Click Results card"""
        card = self.find_element(self.RESULTS_CARD)
        button = card.find_element(By.TAG_NAME, "button")
        button.click()
    
    def get_template_cards(self):
        """Get all template cards"""
        return self.find_elements(self.TEMPLATE_CARDS)
    
    def get_template_count(self):
        """Get number of templates"""
        return len(self.get_template_cards())
    
    def click_template_edit(self, index=0):
        """Click edit button on template card"""
        cards = self.get_template_cards()
        if index < len(cards):
            edit_btn = cards[index].find_element(*self.TEMPLATE_EDIT_BUTTON)
            edit_btn.click()
    
    def click_template_delete(self, index=0):
        """Click delete button on template card"""
        cards = self.get_template_cards()
        if index < len(cards):
            delete_btn = cards[index].find_element(*self.TEMPLATE_DELETE_BUTTON)
            delete_btn.click()
    
    def click_template_assign(self, index=0):
        """Click assign button on template card"""
        cards = self.get_template_cards()
        if index < len(cards):
            assign_btn = cards[index].find_element(*self.TEMPLATE_ASSIGN_BUTTON)
            assign_btn.click()
    
    def click_template_config(self, index=0):
        """Click config button on template card"""
        cards = self.get_template_cards()
        if index < len(cards):
            config_btn = cards[index].find_element(*self.TEMPLATE_CONFIG_BUTTON)
            config_btn.click()
    
    def is_empty_state_displayed(self):
        """Check if empty state is displayed"""
        return self.is_element_visible(self.EMPTY_STATE)
    
    def is_on_dashboard(self):
        """Check if on dashboard page"""
        return "/list" in self.get_current_url()
