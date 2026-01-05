"""
Pytest fixtures and configuration for HR Robots Selenium Tests
"""
import pytest
import os
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from selenium.webdriver.firefox.service import Service as FirefoxService
from selenium.webdriver.edge.service import Service as EdgeService
from config import IMPLICIT_WAIT, PAGE_LOAD_TIMEOUT, HEADLESS, BROWSER


def get_chrome_options():
    """Configure Chrome options"""
    options = webdriver.ChromeOptions()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--disable-extensions")
    # Allow camera/mic for test page
    options.add_argument("--use-fake-ui-for-media-stream")
    options.add_argument("--use-fake-device-for-media-stream")
    return options


def get_firefox_options():
    """Configure Firefox options"""
    options = webdriver.FirefoxOptions()
    if HEADLESS:
        options.add_argument("--headless")
    options.add_argument("--width=1920")
    options.add_argument("--height=1080")
    return options


def get_edge_options():
    """Configure Edge options"""
    options = webdriver.EdgeOptions()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    return options


def get_chrome_driver():
    """Get Chrome WebDriver - tries multiple methods"""
    options = get_chrome_options()
    
    # Add stability options
    options.add_argument("--disable-browser-side-navigation")
    options.add_argument("--disable-infobars")
    options.add_argument("--disable-popup-blocking")
    options.add_experimental_option("excludeSwitches", ["enable-automation"])
    options.add_experimental_option("useAutomationExtension", False)
    
    # Method 1: Try using Selenium's built-in driver manager (Selenium 4.6+)
    try:
        driver = webdriver.Chrome(options=options)
        return driver
    except Exception as e:
        print(f"Method 1 (built-in) failed: {e}")
    
    # Method 2: Try webdriver-manager
    try:
        from webdriver_manager.chrome import ChromeDriverManager
        service = ChromeService(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
        return driver
    except Exception as e:
        print(f"Method 2 (webdriver-manager) failed: {e}")
    
    # Method 3: Try with chromedriver in PATH
    try:
        service = ChromeService()
        driver = webdriver.Chrome(service=service, options=options)
        return driver
    except Exception as e:
        print(f"Method 3 (PATH) failed: {e}")
    
    raise Exception("Could not initialize Chrome WebDriver. Please ensure Chrome and ChromeDriver are installed.")


def get_firefox_driver():
    """Get Firefox WebDriver"""
    options = get_firefox_options()
    
    try:
        driver = webdriver.Firefox(options=options)
        return driver
    except Exception:
        pass
    
    try:
        from webdriver_manager.firefox import GeckoDriverManager
        service = FirefoxService(GeckoDriverManager().install())
        driver = webdriver.Firefox(service=service, options=options)
        return driver
    except Exception as e:
        raise Exception(f"Could not initialize Firefox WebDriver: {e}")


def get_edge_driver():
    """Get Edge WebDriver"""
    options = get_edge_options()
    
    try:
        driver = webdriver.Edge(options=options)
        return driver
    except Exception:
        pass
    
    try:
        from webdriver_manager.microsoft import EdgeChromiumDriverManager
        service = EdgeService(EdgeChromiumDriverManager().install())
        driver = webdriver.Edge(service=service, options=options)
        return driver
    except Exception as e:
        raise Exception(f"Could not initialize Edge WebDriver: {e}")


@pytest.fixture(scope="function")
def driver():
    """Create and configure WebDriver instance"""
    if BROWSER.lower() == "chrome":
        driver = get_chrome_driver()
    elif BROWSER.lower() == "firefox":
        driver = get_firefox_driver()
    elif BROWSER.lower() == "edge":
        driver = get_edge_driver()
    else:
        raise ValueError(f"Unsupported browser: {BROWSER}")
    
    driver.implicitly_wait(IMPLICIT_WAIT)
    driver.set_page_load_timeout(PAGE_LOAD_TIMEOUT)
    
    try:
        driver.maximize_window()
    except Exception:
        driver.set_window_size(1920, 1080)
    
    # Screenshot capture setup
    import threading
    import json
    import time
    
    screenshot_file = os.path.join(os.path.dirname(__file__), 'current_screenshot.json')
    steps_file = os.path.join(os.path.dirname(__file__), 'current_steps.json')
    stop_capture = threading.Event()
    step_counter = [0]
    last_url = [None]
    
    def capture_screenshots():
        while not stop_capture.is_set():
            try:
                screenshot = driver.get_screenshot_as_base64()
                current_url = driver.current_url
                
                # Save current screenshot
                data = {
                    "screenshot": screenshot,
                    "url": current_url,
                    "timestamp": time.time()
                }
                with open(screenshot_file, 'w') as f:
                    json.dump(data, f)
                
                # Detect URL change as a step
                if current_url != last_url[0]:
                    step_counter[0] += 1
                    last_url[0] = current_url
                    
                    # Save step data
                    step_data = {
                        "step": step_counter[0],
                        "action": f"Navigate to {current_url}",
                        "url": current_url,
                        "screenshot": screenshot,
                        "timestamp": time.time()
                    }
                    
                    # Append to steps file
                    try:
                        steps = []
                        if os.path.exists(steps_file):
                            with open(steps_file, 'r') as f:
                                steps = json.load(f)
                        steps.append(step_data)
                        with open(steps_file, 'w') as f:
                            json.dump(steps, f)
                    except:
                        pass
                        
            except:
                pass
            time.sleep(0.5)
    
    capture_thread = threading.Thread(target=capture_screenshots, daemon=True)
    capture_thread.start()
    
    yield driver
    
    stop_capture.set()
    
    try:
        driver.quit()
    except Exception:
        pass
    
    # Cleanup
    try:
        if os.path.exists(screenshot_file):
            os.remove(screenshot_file)
    except:
        pass


@pytest.fixture(scope="function")
def logged_in_driver(driver):
    """Create a driver with logged-in session"""
    from pages.login_page import LoginPage
    from config import TEST_USER, ROUTES
    
    driver.get(ROUTES["login"])
    login_page = LoginPage(driver)
    login_page.login(TEST_USER["email"], TEST_USER["password"])
    
    yield driver
