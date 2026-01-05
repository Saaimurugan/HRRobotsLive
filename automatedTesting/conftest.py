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
def driver(request):
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
    
    test_name = request.node.name if hasattr(request, 'node') else 'unknown'
    screenshot_file = os.path.join(os.path.dirname(__file__), 'current_screenshot.json')
    test_screenshots_file = os.path.join(os.path.dirname(__file__), 'test_screenshots.json')
    stop_capture = threading.Event()
    step_counter = [0]
    last_url = [None]
    last_screenshot_time = [0]
    screenshots_list = []
    
    def capture_screenshots():
        while not stop_capture.is_set():
            try:
                screenshot = driver.get_screenshot_as_base64()
                current_url = driver.current_url
                timestamp = time.time()
                
                # Save current screenshot for live preview
                data = {
                    "screenshot": screenshot,
                    "url": current_url,
                    "timestamp": timestamp,
                    "test": test_name
                }
                with open(screenshot_file, 'w') as f:
                    json.dump(data, f)
                
                # Capture screenshot on URL change OR every 3 seconds
                should_capture = False
                if current_url != last_url[0]:
                    should_capture = True
                    last_url[0] = current_url
                elif timestamp - last_screenshot_time[0] >= 3:
                    should_capture = True
                
                if should_capture:
                    step_counter[0] += 1
                    last_screenshot_time[0] = timestamp
                    
                    step_data = {
                        "step": step_counter[0],
                        "action": f"Step {step_counter[0]}: {current_url.split('/')[-1] or 'home'}",
                        "url": current_url,
                        "screenshot": screenshot,
                        "timestamp": timestamp
                    }
                    screenshots_list.append(step_data)
                    
                    # Save to file for dashboard
                    try:
                        all_screenshots = {}
                        if os.path.exists(test_screenshots_file):
                            with open(test_screenshots_file, 'r') as f:
                                all_screenshots = json.load(f)
                        all_screenshots[test_name] = screenshots_list
                        with open(test_screenshots_file, 'w') as f:
                            json.dump(all_screenshots, f)
                    except:
                        pass
                        
            except:
                pass
            time.sleep(0.5)
    
    capture_thread = threading.Thread(target=capture_screenshots, daemon=True)
    capture_thread.start()
    
    yield driver
    
    # Capture final screenshot
    try:
        final_screenshot = driver.get_screenshot_as_base64()
        final_url = driver.current_url
        step_counter[0] += 1
        screenshots_list.append({
            "step": step_counter[0],
            "action": "Test completed",
            "url": final_url,
            "screenshot": final_screenshot,
            "timestamp": time.time()
        })
        
        # Save final screenshots
        all_screenshots = {}
        if os.path.exists(test_screenshots_file):
            with open(test_screenshots_file, 'r') as f:
                all_screenshots = json.load(f)
        all_screenshots[test_name] = screenshots_list
        with open(test_screenshots_file, 'w') as f:
            json.dump(all_screenshots, f)
    except:
        pass
    
    stop_capture.set()
    
    try:
        driver.quit()
    except Exception:
        pass
    
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
