"""
Results Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class ResultPage(BasePage):
    """Page object for Results page"""
    
    # Locators
    TEST_LINK_INPUT = (By.CSS_SELECTOR, "input[placeholder*='link'], input[type='text']")
    SEARCH_BUTTON = (By.XPATH, "//button[contains(., 'Search')]")
    RESULTS_CONTAINER = (By.CSS_SELECTOR, "div.results-container")
    SCORE_DISPLAY = (By.CSS_SELECTOR, "div.score-display")
    SCORE_VALUE = (By.CSS_SELECTOR, "span.score-value, div.score-display span")
    QUESTION_REVIEW = (By.CSS_SELECTOR, "div.question-review")
    QUESTION_ITEMS = (By.CSS_SELECTOR, "div.question-item")
    CANDIDATE_ANSWER = (By.CSS_SELECTOR, "div.candidate-answer")
    CORRECT_ANSWER = (By.CSS_SELECTOR, "div.correct-answer")
    PRINT_BUTTON = (By.XPATH, "//button[contains(., 'Print')]")
    EXPORT_BUTTON = (By.XPATH, "//button[contains(., 'Export')]")
    NO_RESULTS_MESSAGE = (By.CSS_SELECTOR, "div.no-results, div.empty-state")
    ERROR_MESSAGE = (By.CSS_SELECTOR, "div.error-message, div.message-box.error")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["result"]
    
    def navigate(self):
        """Navigate to results page"""
        self.navigate_to(self.url)
    
    def enter_test_link(self, link):
        """Enter test link"""
        self.send_keys(self.TEST_LINK_INPUT, link)
    
    def click_search(self):
        """Click search button"""
        self.click(self.SEARCH_BUTTON)
    
    def search_results(self, test_link):
        """Search for test results"""
        self.enter_test_link(test_link)
        self.click_search()
    
    def is_results_displayed(self):
        """Check if results are displayed"""
        return self.is_element_visible(self.RESULTS_CONTAINER)
    
    def get_score(self):
        """Get test score"""
        if self.is_element_visible(self.SCORE_DISPLAY):
            return self.get_text(self.SCORE_DISPLAY)
        return None
    
    def get_question_review_items(self):
        """Get all question review items"""
        return self.find_elements(self.QUESTION_ITEMS)
    
    def get_question_count(self):
        """Get number of questions in review"""
        return len(self.get_question_review_items())
    
    def click_print(self):
        """Click print button"""
        self.click(self.PRINT_BUTTON)
    
    def click_export(self):
        """Click export button"""
        self.click(self.EXPORT_BUTTON)
    
    def is_print_button_visible(self):
        """Check if print button is visible"""
        return self.is_element_visible(self.PRINT_BUTTON)
    
    def is_export_button_visible(self):
        """Check if export button is visible"""
        return self.is_element_visible(self.EXPORT_BUTTON)
    
    def is_no_results_displayed(self):
        """Check if no results message is displayed"""
        return self.is_element_visible(self.NO_RESULTS_MESSAGE)
    
    def get_error_message(self):
        """Get error message"""
        if self.is_element_visible(self.ERROR_MESSAGE):
            return self.get_text(self.ERROR_MESSAGE)
        return None
