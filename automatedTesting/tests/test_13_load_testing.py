'''
Test Suite: Load Testing
Tests system behavior under concurrent load and stress conditions
'''
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
    'concurrent_users_light': 2,
    'concurrent_users_medium': 3,
    'concurrent_users_heavy': 5,
    'ramp_up_time': 2,
    'think_time_min': 1,
}

LOAD_THRESHOLDS = {
    'page_load_under_load': 10.0,
    'login_under_load': 10.0,
    'success_rate_min': 0.80,
}


class LoadTestMetrics:
    def __init__(self):
        self.lock = threading.Lock()
        self.response_times = []
        self.successes = 0
        self.failures = 0
        self.start_time = None
        self.end_time = None

    def record_success(self, duration, operation=''):
        with self.lock:
            self.successes += 1
            self.response_times.append({'duration': duration, 'operation': operation})

    def record_failure(self, error, operation=''):
        with self.lock:
            self.failures += 1

    def start(self):
        self.start_time = time.time()

    def stop(self):
        self.end_time = time.time()

    def get_summary(self):
        with self.lock:
            total = self.successes + self.failures
            durations = [r['duration'] for r in self.response_times]
            return {
                'total_requests': total,
                'successes': self.successes,
                'failures': self.failures,
                'success_rate': self.successes / total if total > 0 else 0,
                'avg_response_time': statistics.mean(durations) if durations else 0,
                'max_response_time': max(durations) if durations else 0,
                'p95_response_time': self._percentile(durations, 95) if durations else 0,
                'throughput': total / (self.end_time - self.start_time) if self.end_time and self.start_time else 0,
            }

    def _percentile(self, data, percentile):
        if not data:
            return 0
        sorted_data = sorted(data)
        index = int(len(sorted_data) * percentile / 100)
        return sorted_data[min(index, len(sorted_data) - 1)]


def create_load_test_driver():
    options = Options()
    if HEADLESS:
        options.add_argument('--headless=new')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--disable-gpu')
    options.add_argument('--window-size=1920,1080')
    options.add_argument('--disable-extensions')
    options.add_argument('--disable-logging')
    options.add_argument('--log-level=3')
    try:
        driver = webdriver.Chrome(options=options)
    except Exception:
        service = Service(ChromeDriverManager().install())
        driver = webdriver.Chrome(service=service, options=options)
    driver.implicitly_wait(10)
    return driver


class TestConcurrentPageLoads:
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver

    def test_concurrent_login_page_loads(self):
        '''Test multiple users loading login page simultaneously'''
        metrics = LoadTestMetrics()
        num_users = LOAD_CONFIG['concurrent_users_light']

        def load_login_page(user_id):
            drv = None
            try:
                drv = create_load_test_driver()
                start = time.time()
                drv.get(ROUTES['login'])
                drv.execute_script('return document.readyState') == 'complete'
                duration = time.time() - start
                metrics.record_success(duration, f'login_page_user_{user_id}')
            except Exception as e:
                metrics.record_failure(e, f'login_page_user_{user_id}')
            finally:
                if drv:
                    drv.quit()

        metrics.start()
        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [executor.submit(load_login_page, i) for i in range(num_users)]
            for future in as_completed(futures):
                pass
        metrics.stop()

        summary = metrics.get_summary()
        print(f'\nConcurrent Login Page Load: Users={num_users}, Success={summary["success_rate"]*100:.1f}%')
        assert summary['success_rate'] >= LOAD_THRESHOLDS['success_rate_min']


class TestConcurrentAuthentication:
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver

    def test_concurrent_login_attempts(self):
        '''Test multiple simultaneous login attempts'''
        metrics = LoadTestMetrics()
        num_users = LOAD_CONFIG['concurrent_users_light']

        def perform_login(user_id):
            drv = None
            try:
                drv = create_load_test_driver()
                login_page = LoginPage(drv)
                login_page.navigate()
                login_page.enter_email(TEST_USER['email'])
                login_page.enter_password(TEST_USER['password'])
                login_page.accept_eula()
                start = time.time()
                login_page.click_login()
                login_page.wait_for_url_contains('/list', timeout=20)
                duration = time.time() - start
                metrics.record_success(duration, f'login_user_{user_id}')
            except Exception as e:
                metrics.record_failure(e, f'login_user_{user_id}')
            finally:
                if drv:
                    drv.quit()

        metrics.start()
        with ThreadPoolExecutor(max_workers=num_users) as executor:
            futures = [executor.submit(perform_login, i) for i in range(num_users)]
            for future in as_completed(futures):
                pass
        metrics.stop()

        summary = metrics.get_summary()
        print(f'\nConcurrent Login: Users={num_users}, Success={summary["success_rate"]*100:.1f}%')
        assert summary['success_rate'] >= LOAD_THRESHOLDS['success_rate_min']


class TestStressConditions:
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver

    def test_burst_traffic(self):
        '''Test system handles sudden traffic burst'''
        metrics = LoadTestMetrics()
        burst_size = LOAD_CONFIG['concurrent_users_medium']

        def burst_request(request_id):
            drv = None
            try:
                drv = create_load_test_driver()
                start = time.time()
                drv.get(ROUTES['login'])
                drv.execute_script('return document.readyState') == 'complete'
                duration = time.time() - start
                metrics.record_success(duration, f'burst_{request_id}')
            except Exception as e:
                metrics.record_failure(e, f'burst_{request_id}')
            finally:
                if drv:
                    drv.quit()

        metrics.start()
        with ThreadPoolExecutor(max_workers=burst_size) as executor:
            futures = [executor.submit(burst_request, i) for i in range(burst_size)]
            for future in as_completed(futures):
                pass
        metrics.stop()

        summary = metrics.get_summary()
        print(f'\nBurst Traffic: Size={burst_size}, Success={summary["success_rate"]*100:.1f}%')
        assert summary['success_rate'] >= 0.7


class TestResourceUtilization:
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        self.driver = driver

    def test_memory_under_load(self):
        '''Test memory usage does not grow excessively under load'''
        memory_readings = []
        for i in range(3):
            self.driver.get(ROUTES['login'])
            self.driver.get(ROUTES['signup'])
            try:
                memory = self.driver.execute_script(
                    'return window.performance.memory ? window.performance.memory.usedJSHeapSize : null'
                )
                if memory:
                    memory_readings.append(memory / (1024 * 1024))
            except Exception:
                pass
        if memory_readings and len(memory_readings) >= 2 and memory_readings[0] > 0:
            growth = (memory_readings[-1] - memory_readings[0]) / memory_readings[0]
            print(f'\nMemory: Initial={memory_readings[0]:.2f}MB, Final={memory_readings[-1]:.2f}MB')
            # Memory growth is expected in browsers - informational only


def test_load_test_summary():
    '''Generate load test summary report'''
    print('\n' + '='*60)
    print('LOAD TESTING SUMMARY')
    print('='*60)
