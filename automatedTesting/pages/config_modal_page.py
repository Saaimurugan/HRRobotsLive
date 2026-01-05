"""
Config Modal Page Object
Handles the template configuration modal with range sliders
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from pages.base_page import BasePage
from config import EXPLICIT_WAIT


class ConfigModalPage(BasePage):
    """Page object for Configuration Modal"""
    
    # Modal Locators
    MODAL_OVERLAY = (By.CSS_SELECTOR, "div.overlay")
    MODAL_BOX = (By.CSS_SELECTOR, "div.confirmation-box")
    MODAL_TITLE = (By.CSS_SELECTOR, "div.confirmation-box h2")
    
    # Range Slider Inputs (all 4 fields are now range sliders)
    NUMBER_OF_QUESTIONS_SLIDER = (By.CSS_SELECTOR, "input#numberOfQuestions[type='range']")
    TEST_DURATION_SLIDER = (By.CSS_SELECTOR, "input#testDuration[type='range']")
    SENSITIVITY_LEVEL_SLIDER = (By.CSS_SELECTOR, "input#sensitivityLevel[type='range']")
    ALLOWED_DEFAULTS_SLIDER = (By.CSS_SELECTOR, "input#allowedDefaults[type='range']")
    
    # Labels (display current values)
    NUMBER_OF_QUESTIONS_LABEL = (By.CSS_SELECTOR, "label[for='numberOfQuestions']")
    TEST_DURATION_LABEL = (By.CSS_SELECTOR, "label[for='testDuration']")
    SENSITIVITY_LEVEL_LABEL = (By.CSS_SELECTOR, "label[for='sensitivityLevel']")
    ALLOWED_DEFAULTS_LABEL = (By.CSS_SELECTOR, "label[for='allowedDefaults']")
    
    # Buttons
    SAVE_BUTTON = (By.CSS_SELECTOR, "div.buttons button[type='submit']")
    CANCEL_BUTTON = (By.CSS_SELECTOR, "div.buttons button[type='button']")
    
    def __init__(self, driver):
        super().__init__(driver)
    
    def is_modal_visible(self, timeout=5):
        """Check if config modal is visible"""
        return self.is_element_visible(self.MODAL_OVERLAY, timeout)
    
    def wait_for_modal(self, timeout=10):
        """Wait for modal to appear"""
        wait = WebDriverWait(self.driver, timeout)
        wait.until(EC.visibility_of_element_located(self.MODAL_BOX))
    
    def get_modal_title(self):
        """Get modal title text"""
        return self.get_text(self.MODAL_TITLE)
    
    # Range slider methods
    def set_slider_value(self, slider_locator, value):
        """Set value on a range slider using JavaScript"""
        slider = self.find_element(slider_locator)
        self.driver.execute_script(
            "arguments[0].value = arguments[1]; "
            "arguments[0].dispatchEvent(new Event('input', { bubbles: true })); "
            "arguments[0].dispatchEvent(new Event('change', { bubbles: true }));",
            slider, value
        )
    
    def get_slider_value(self, slider_locator):
        """Get current value of a range slider"""
        slider = self.find_element(slider_locator)
        return int(slider.get_attribute("value"))
    
    def get_slider_min(self, slider_locator):
        """Get min value of a range slider"""
        slider = self.find_element(slider_locator)
        return int(slider.get_attribute("min"))
    
    def get_slider_max(self, slider_locator):
        """Get max value of a range slider"""
        slider = self.find_element(slider_locator)
        return int(slider.get_attribute("max"))
    
    # Number of Questions
    def set_number_of_questions(self, value):
        """Set number of questions using range slider"""
        self.set_slider_value(self.NUMBER_OF_QUESTIONS_SLIDER, value)
    
    def get_number_of_questions(self):
        """Get current number of questions value"""
        return self.get_slider_value(self.NUMBER_OF_QUESTIONS_SLIDER)
    
    def get_number_of_questions_label(self):
        """Get the label text showing current value"""
        return self.get_text(self.NUMBER_OF_QUESTIONS_LABEL)
    
    # Test Duration
    def set_test_duration(self, value):
        """Set test duration using range slider"""
        self.set_slider_value(self.TEST_DURATION_SLIDER, value)
    
    def get_test_duration(self):
        """Get current test duration value"""
        return self.get_slider_value(self.TEST_DURATION_SLIDER)
    
    def get_test_duration_label(self):
        """Get the label text showing current value"""
        return self.get_text(self.TEST_DURATION_LABEL)
    
    # Sensitivity Level
    def set_sensitivity_level(self, value):
        """Set sensitivity level using range slider"""
        self.set_slider_value(self.SENSITIVITY_LEVEL_SLIDER, value)
    
    def get_sensitivity_level(self):
        """Get current sensitivity level value"""
        return self.get_slider_value(self.SENSITIVITY_LEVEL_SLIDER)
    
    def get_sensitivity_level_label(self):
        """Get the label text showing current value"""
        return self.get_text(self.SENSITIVITY_LEVEL_LABEL)
    
    # Allowed Defaults
    def set_allowed_defaults(self, value):
        """Set allowed defaults using range slider"""
        self.set_slider_value(self.ALLOWED_DEFAULTS_SLIDER, value)
    
    def get_allowed_defaults(self):
        """Get current allowed defaults value"""
        return self.get_slider_value(self.ALLOWED_DEFAULTS_SLIDER)
    
    def get_allowed_defaults_label(self):
        """Get the label text showing current value"""
        return self.get_text(self.ALLOWED_DEFAULTS_LABEL)
    
    # Actions
    def click_save(self):
        """Click save button"""
        self.click(self.SAVE_BUTTON)
    
    def click_cancel(self):
        """Click cancel button"""
        self.click(self.CANCEL_BUTTON)
    
    def wait_for_modal_close(self, timeout=5):
        """Wait for modal to close"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.invisibility_of_element_located(self.MODAL_OVERLAY))
            return True
        except:
            return False
