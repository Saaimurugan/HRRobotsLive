"""
Utility functions for Selenium tests
"""
import time
import os
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from config import EXPLICIT_WAIT


class SeleniumHelpers:
    """Helper methods for Selenium operations"""
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)
    
    def wait_for_element(self, locator, timeout=None):
        """Wait for element to be present"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.presence_of_element_located(locator))
    
    def wait_for_element_visible(self, locator, timeout=None):
        """Wait for element to be visible"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.visibility_of_element_located(locator))
    
    def wait_for_element_clickable(self, locator, timeout=None):
        """Wait for element to be clickable"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.element_to_be_clickable(locator))
    
    def wait_for_url_contains(self, text, timeout=None):
        """Wait for URL to contain text"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.url_contains(text))
    
    def wait_for_text_in_element(self, locator, text, timeout=None):
        """Wait for text to be present in element"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.text_to_be_present_in_element(locator, text))
    
    def is_element_present(self, locator):
        """Check if element is present"""
        try:
            self.driver.find_element(*locator)
            return True
        except NoSuchElementException:
            return False
    
    def is_element_visible(self, locator):
        """Check if element is visible"""
        try:
            element = self.driver.find_element(*locator)
            return element.is_displayed()
        except NoSuchElementException:
            return False
    
    def scroll_to_element(self, element):
        """Scroll element into view"""
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(0.3)
    
    def scroll_to_bottom(self, element=None):
        """Scroll to bottom of page or element"""
        if element:
            self.driver.execute_script(
                "arguments[0].scrollTop = arguments[0].scrollHeight", element
            )
        else:
            self.driver.execute_script(
                "window.scrollTo(0, document.body.scrollHeight);"
            )
        time.sleep(0.3)
    
    def clear_and_send_keys(self, element, text):
        """Clear field and send keys"""
        element.clear()
        element.send_keys(text)
    
    def get_toast_message(self):
        """Get current toast message"""
        try:
            toast = self.wait_for_element_visible((By.CSS_SELECTOR, "div.toast"))
            return toast.text
        except TimeoutException:
            return None
    
    def wait_for_toast_to_disappear(self, timeout=10):
        """Wait for toast notification to disappear"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.invisibility_of_element_located((By.CSS_SELECTOR, "div.toast")))
        except TimeoutException:
            pass
    
    def take_screenshot(self, name):
        """Take screenshot and save to screenshots folder"""
        screenshots_dir = os.path.join(os.path.dirname(__file__), "..", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        filepath = os.path.join(screenshots_dir, f"{name}_{int(time.time())}.png")
        self.driver.save_screenshot(filepath)
        return filepath
    
    def js_click(self, element):
        """Click element using JavaScript"""
        self.driver.execute_script("arguments[0].click();", element)
    
    def get_element_text(self, locator):
        """Get text from element"""
        element = self.wait_for_element_visible(locator)
        return element.text
    
    def get_element_value(self, locator):
        """Get value attribute from element"""
        element = self.wait_for_element(locator)
        return element.get_attribute("value")
    
    def wait_for_loading_to_complete(self, timeout=15):
        """Wait for loading spinner to disappear"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, "svg.spinner, .loading, .loader")
            ))
        except TimeoutException:
            pass
