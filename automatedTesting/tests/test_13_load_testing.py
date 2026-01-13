"""
Test Suite: Load Testing
Tests system behavior under concurrent load and stress conditions
"""
import pytest
import time
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from webdriver_manager.chrome import ChromeDriverManager
from pages.login_page import LoginPage
from pages.signup_page import SignupPage
from pages.dashboard_page import DashboardPage
from config import TEST_USER, ROUTES, BASE_URL, HEADLESS


LOAD_CONFIG = {
    "concurrent_users_light": 2,
    "concurrent_users_medium": 3,
    "ramp_up_time": 1,
}

LOAD_THRESHOLDS = {
    "page_load_under_load": 15.0,
    "success_rate_min": 0.70,
}


class LoadTestMetrics:
    """Thread-safe metrics collector"""
    
    def __init__(self):
        self.lock = threading.Lock()
        self.response_times = []
        self.successes = 0
        self.failures = 0
        self.start_time = None
        self.end_time = None

    def record_success(self, duration):
        with self.lock:
            self.successes += 1
            self.response_times.append(duration)
    
    def record_failure(self):
        with self.lock:
            self.failures += 1
    
    def start(self):
        self.start_time = time.time()
    
    def stop(self):
        self.end_time = time.time()
    
    def get_summary(self):
        with self.lock:
            total = self.successes + self.failures
            return {
                "total": total,
                "successes": self.successes,
                "failures": self.failures,
                "success_rate": self.successes / total if total > 0 else 0,
                "avg_time": statistics.mean(self.response_times) if self.response_times else 0,
                "max_time": max(self.response_times) if self.response_times else 0,
            }


def create_driver():
    """Create WebDriver for load testing"""
    options = Options()
    if HEADLESS:
        options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-logging")
    options.add_argument("--log-level=3")
    
    try:
        drv = webdriver.Chrome(options=options)
    except Exception:
        service = Service(ChromeDriverManager().install())
        drv = webdriver.Chrome(service=service, options=options)
    
    drv.implicitly_wait(10)
    drv.set_page_load_timeout(30)
    return drv


class TestConcurrentPageLoads:
    """Test concurrent page load performance"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
    
    def test_concurrent_login_page_loads(self):
        """Test multiple users loading login page simultaneously"""
        metrics = LoadTestMetrics()
        num_users = LOAD_CONFIG["concurrent_users_light"]
        
        def load_page(user_id):
            drv = None
            try:
                drv = create_driver()
                start = time.time()
                drv.get(ROUTES["login"])
                duration = time.time() - start
                metrics.record_success(duration)
            except Exception:
                metrics.record_failure()
            finally:
                if drv:
                    try:
                        drv.quit()
                    except Exception:
                        pass
        
        metrics.start()
        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [executor.submit(load_page, i) for i in range(num_users)]
            for future in as_completed(futures, timeout=60):
                pass
        metrics.stop()
        
        summary = metrics.get_summary()
        print(f"\nConcurrent Page Load: Users={num_users}, Success={summary['success_rate']*100:.0f}%")
        
        assert summary["success_rate"] >= LOAD_THRESHOLDS["success_rate_min"]


class TestConcurrentAuthentication:
    """Test concurrent authentication"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
    
    def test_concurrent_login_attempts(self):
        """Test multiple simultaneous login attempts"""
        metrics = LoadTestMetrics()
        num_users = LOAD_CONFIG["concurrent_users_light"]
        
        def perform_login(user_id):
            drv = None
            try:
                drv = create_driver()
                login_page = LoginPage(drv)
                login_page.navigate()
                login_page.enter_email(TEST_USER["email"])
                login_page.enter_password(TEST_USER["password"])
                login_page.accept_eula()
                
                start = time.time()
                login_page.click_login()
                login_page.wait_for_url_contains("/list", timeout=20)
                duration = time.time() - start
                metrics.record_success(duration)
            except Exception:
                metrics.record_failure()
            finally:
                if drv:
                    try:
                        drv.quit()
                    except Exception:
                        pass
        
        metrics.start()
        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [executor.submit(perform_login, i) for i in range(num_users)]
            for future in as_completed(futures, timeout=90):
                pass
        metrics.stop()
        
        summary = metrics.get_summary()
        print(f"\nConcurrent Login: Users={num_users}, Success={summary['success_rate']*100:.0f}%")
        
        assert summary["success_rate"] >= LOAD_THRESHOLDS["success_rate_min"]


class TestStressConditions:
    """Test system under stress"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
    
    def test_burst_traffic(self):
        """Test system handles traffic burst"""
        metrics = LoadTestMetrics()
        burst_size = LOAD_CONFIG["concurrent_users_medium"]
        
        def burst_request(request_id):
            drv = None
            try:
                drv = create_driver()
                start = time.time()
                drv.get(ROUTES["login"])
                duration = time.time() - start
                metrics.record_success(duration)
            except Exception:
                metrics.record_failure()
            finally:
                if drv:
                    try:
                        drv.quit()
                    except Exception:
                        pass
        
        metrics.start()
        with ThreadPoolExecutor(max_workers=burst_size) as executor:
            futures = [executor.submit(burst_request, i) for i in range(burst_size)]
            for future in as_completed(futures, timeout=60):
                pass
        metrics.stop()
        
        summary = metrics.get_summary()
        print(f"\nBurst Traffic: Size={burst_size}, Success={summary['success_rate']*100:.0f}%")
        
        assert summary["success_rate"] >= 0.6


class TestResourceUtilization:
    """Test resource utilization"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver
    
    def test_memory_monitoring(self):
        """Monitor memory usage under load (informational)"""
        memory_readings = []
        
        for _ in range(3):
            self.driver.get(ROUTES["login"])
            self.driver.get(ROUTES["signup"])
            
            try:
                memory = self.driver.execute_script(
                    "return window.performance.memory ? window.performance.memory.usedJSHeapSize : null"
                )
                if memory:
                    memory_readings.append(memory / (1024 * 1024))
            except Exception:
                pass
        
        if memory_readings:
            print(f"\nMemory: Initial={memory_readings[0]:.1f}MB, Final={memory_readings[-1]:.1f}MB")


def test_load_test_summary():
    """Load test summary"""
    print("\n" + "="*50)
    print("LOAD TESTING COMPLETE")
    print("="*50)
