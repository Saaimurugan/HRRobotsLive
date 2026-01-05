"""
Pytest plugin for capturing screenshots during test execution
Sends screenshots to the dashboard via a shared file
"""
import pytest
import os
import base64
import json
import time

SCREENSHOT_FILE = os.path.join(os.path.dirname(__file__), 'current_screenshot.json')


def save_screenshot_data(driver, test_name=""):
    """Save screenshot data to shared file"""
    try:
        screenshot = driver.get_screenshot_as_base64()
        current_url = driver.current_url
        
        data = {
            "screenshot": screenshot,
            "url": current_url,
            "test": test_name,
            "timestamp": time.time()
        }
        
        with open(SCREENSHOT_FILE, 'w') as f:
            json.dump(data, f)
    except Exception as e:
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_call(item):
    """Hook to capture screenshots during test execution"""
    yield
    
    # Try to get driver from the test
    try:
        if hasattr(item, 'funcargs') and 'driver' in item.funcargs:
            driver = item.funcargs['driver']
            save_screenshot_data(driver, item.name)
    except:
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_setup(item):
    """Capture screenshot after setup"""
    yield
    
    try:
        if hasattr(item, 'funcargs') and 'driver' in item.funcargs:
            driver = item.funcargs['driver']
            save_screenshot_data(driver, f"setup: {item.name}")
    except:
        pass


@pytest.hookimpl(hookwrapper=True)
def pytest_runtest_teardown(item):
    """Capture screenshot before teardown"""
    try:
        if hasattr(item, 'funcargs') and 'driver' in item.funcargs:
            driver = item.funcargs['driver']
            save_screenshot_data(driver, f"teardown: {item.name}")
    except:
        pass
    
    yield
