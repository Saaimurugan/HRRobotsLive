"""
Base Page Object for all page classes
"""
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.common.exceptions import TimeoutException
from config import EXPLICIT_WAIT
import time


class BasePage:
    """Base class for all page objects"""
    
    def __init__(self, driver):
        self.driver = driver
        self.wait = WebDriverWait(driver, EXPLICIT_WAIT)
    
    def navigate_to(self, url):
        """Navigate to URL"""
        self.driver.get(url)
    
    def get_current_url(self):
        """Get current URL"""
        return self.driver.current_url
    
    def get_title(self):
        """Get page title"""
        return self.driver.title
    
    def find_element(self, locator):
        """Find element with wait"""
        return self.wait.until(EC.presence_of_element_located(locator))
    
    def find_elements(self, locator):
        """Find multiple elements"""
        return self.driver.find_elements(*locator)
    
    def click(self, locator, timeout=None):
        """Click element"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        element = wait.until(EC.element_to_be_clickable(locator))
        try:
            element.click()
        except Exception:
            # Fallback to JavaScript click
            self.driver.execute_script("arguments[0].click();", element)
    
    def send_keys(self, locator, text):
        """Send keys to element"""
        element = self.find_element(locator)
        element.clear()
        element.send_keys(text)
    
    def get_text(self, locator):
        """Get element text"""
        element = self.wait.until(EC.visibility_of_element_located(locator))
        return element.text
    
    def is_element_visible(self, locator, timeout=5):
        """Check if element is visible"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.visibility_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    def is_element_present(self, locator, timeout=5):
        """Check if element is present"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.presence_of_element_located(locator))
            return True
        except TimeoutException:
            return False
    
    def wait_for_url_contains(self, text, timeout=None):
        """Wait for URL to contain text"""
        wait = WebDriverWait(self.driver, timeout or EXPLICIT_WAIT)
        return wait.until(EC.url_contains(text))
    
    def scroll_to_element(self, element):
        """Scroll element into view"""
        self.driver.execute_script("arguments[0].scrollIntoView(true);", element)
        time.sleep(0.3)
    
    def scroll_to_bottom(self):
        """Scroll to bottom of page"""
        self.driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(0.3)
    
    def take_screenshot(self, name):
        """Take screenshot"""
        import os
        screenshots_dir = os.path.join(os.path.dirname(__file__), "..", "screenshots")
        os.makedirs(screenshots_dir, exist_ok=True)
        filepath = os.path.join(screenshots_dir, f"{name}_{int(time.time())}.png")
        self.driver.save_screenshot(filepath)
        return filepath
    
    def wait_for_loading(self, timeout=15):
        """Wait for loading spinner to disappear"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            wait.until(EC.invisibility_of_element_located(
                (By.CSS_SELECTOR, "svg.spinner, .loading, .loader")
            ))
        except TimeoutException:
            pass
    
    def get_toast_message(self, timeout=10):
        """Get toast notification message"""
        try:
            wait = WebDriverWait(self.driver, timeout)
            toast = wait.until(EC.visibility_of_element_located(
                (By.CSS_SELECTOR, "div.toast")
            ))
            return toast.text
        except TimeoutException:
            return None
