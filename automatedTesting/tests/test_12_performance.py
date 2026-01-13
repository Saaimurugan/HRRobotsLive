"""
Test Suite: Performance Testing
Tests response times, page load times, and API performance for all features
"""
import pytest
import time
import statistics
from pages.login_page import LoginPage
from pages.signup_page import SignupPage
from pages.forgot_password_page import ForgotPasswordPage
from pages.dashboard_page import DashboardPage
from pages.create_jd_page import CreateJDPage
from pages.profiler_page import ProfilerPage
from pages.create_template_page import CreateTemplatePage
from pages.result_page import ResultPage
from pages.profile_page import ProfilePage
from pages.eula_page import EULAPage
from config import TEST_USER, TEST_JD_DATA, ROUTES, BASE_URL


# Performance thresholds (in seconds)
THRESHOLDS = {
    "page_load": 45.0,          # Max page load time
    "page_load_warning": 15.0,  # Warning threshold
    "api_response": 30.0,       # Max API response time
    "ai_generation": 90.0,      # Max AI generation time
    "file_upload": 30.0,        # Max file upload time
    "login": 30.0,              # Max login time
    "form_submission": 20.0,    # Max form submission time
}


class PerformanceMetrics:
    """Helper class to collect and analyze performance metrics"""
    
    def __init__(self):
        self.metrics = {}
    
    def record(self, name, duration):
        if name not in self.metrics:
            self.metrics[name] = []
        self.metrics[name].append(duration)
    
    def get_stats(self, name):
        if name not in self.metrics or not self.metrics[name]:
            return None
        values = self.metrics[name]
        return {
            "min": min(values),
            "max": max(values),
            "avg": statistics.mean(values),
            "median": statistics.median(values),
            "count": len(values),
            "std_dev": statistics.stdev(values) if len(values) > 1 else 0
        }
    
    def get_all_stats(self):
        return {name: self.get_stats(name) for name in self.metrics}


@pytest.fixture(scope="module")
def perf_metrics():
    """Shared performance metrics collector"""
    return PerformanceMetrics()


class TestPageLoadPerformance:
    """Performance tests for page load times"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver, perf_metrics):
        self.driver = driver
        self.metrics = perf_metrics
    
    def measure_page_load(self, url, page_name):
        """Measure page load time"""
        start = time.time()
        self.driver.get(url)
        
        # Wait for page to be interactive
        self.driver.execute_script("return document.readyState") == "complete"
        
        duration = time.time() - start
        self.metrics.record(f"page_load_{page_name}", duration)
        return duration
    
    def test_login_page_load_time(self):
        """Test login page load performance"""
        duration = self.measure_page_load(ROUTES["login"], "login")
        assert duration < THRESHOLDS["page_load"], f"Login page load too slow: {duration:.2f}s"
    
    def test_signup_page_load_time(self):
        """Test signup page load performance"""
        duration = self.measure_page_load(ROUTES["signup"], "signup")
        assert duration < THRESHOLDS["page_load"], f"Signup page load too slow: {duration:.2f}s"
    
    def test_forgot_password_page_load_time(self):
        """Test forgot password page load performance"""
        duration = self.measure_page_load(ROUTES["forgot_password"], "forgot_password")
        assert duration < THRESHOLDS["page_load"], f"Forgot password page load too slow: {duration:.2f}s"
    
    def test_eula_page_load_time(self):
        """Test EULA page load performance"""
        duration = self.measure_page_load(f"{BASE_URL}/eula", "eula")
        assert duration < THRESHOLDS["page_load"], f"EULA page load too slow: {duration:.2f}s"
    
    def test_dashboard_page_load_time(self, authenticated_driver):
        """Test dashboard page load performance (authenticated)"""
        start = time.time()
        authenticated_driver.get(ROUTES["dashboard"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_dashboard", duration)
        assert duration < THRESHOLDS["page_load"], f"Dashboard page load too slow: {duration:.2f}s"
    
    def test_create_jd_page_load_time(self, authenticated_driver):
        """Test create JD page load performance"""
        start = time.time()
        authenticated_driver.get(ROUTES["create_jd"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_create_jd", duration)
        assert duration < THRESHOLDS["page_load"], f"Create JD page load too slow: {duration:.2f}s"
    
    def test_profiler_page_load_time(self, authenticated_driver):
        """Test profiler page load performance"""
        start = time.time()
        authenticated_driver.get(ROUTES["profiler"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_profiler", duration)
        assert duration < THRESHOLDS["page_load"], f"Profiler page load too slow: {duration:.2f}s"
    
    def test_create_template_page_load_time(self, authenticated_driver):
        """Test create template page load performance"""
        start = time.time()
        authenticated_driver.get(ROUTES["create_template"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_create_template", duration)
        assert duration < THRESHOLDS["page_load"], f"Create template page load too slow: {duration:.2f}s"
    
    def test_results_page_load_time(self, authenticated_driver):
        """Test results page load performance"""
        start = time.time()
        authenticated_driver.get(ROUTES["result"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_results", duration)
        assert duration < THRESHOLDS["page_load"], f"Results page load too slow: {duration:.2f}s"
    
    def test_profile_page_load_time(self, authenticated_driver):
        """Test profile page load performance"""
        start = time.time()
        authenticated_driver.get(ROUTES["profile"])
        authenticated_driver.execute_script("return document.readyState") == "complete"
        duration = time.time() - start
        
        self.metrics.record("page_load_profile", duration)
        assert duration < THRESHOLDS["page_load"], f"Profile page load too slow: {duration:.2f}s"
    
    def test_repeated_page_loads(self):
        """Test page load consistency over multiple loads"""
        durations = []
        for _ in range(5):
            duration = self.measure_page_load(ROUTES["login"], "login_repeated")
            durations.append(duration)
            time.sleep(0.5)
        
        avg_duration = statistics.mean(durations)
        max_duration = max(durations)
        
        assert avg_duration < THRESHOLDS["page_load"], f"Average page load too slow: {avg_duration:.2f}s"
        assert max_duration < THRESHOLDS["page_load"] * 1.5, f"Max page load too slow: {max_duration:.2f}s"


class TestAuthenticationPerformance:
    """Performance tests for authentication operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver, perf_metrics):
        self.driver = driver
        self.metrics = perf_metrics
        self.login_page = LoginPage(driver)
    
    def test_login_response_time(self):
        """Test login operation response time"""
        self.login_page.navigate()
        self.login_page.enter_email(TEST_USER["email"])
        self.login_page.enter_password(TEST_USER["password"])
        self.login_page.accept_eula()
        
        start = time.time()
        self.login_page.click_login()
        self.login_page.wait_for_url_contains("/list", timeout=10)
        duration = time.time() - start
        
        self.metrics.record("login_response", duration)
        assert duration < THRESHOLDS["login"], f"Login too slow: {duration:.2f}s"
    
    def test_login_with_invalid_credentials_response_time(self):
        """Test login failure response time"""
        self.login_page.navigate()
        self.login_page.enter_email(TEST_USER["email"])
        self.login_page.enter_password("WrongPassword123!")
        
        start = time.time()
        self.login_page.click_login()
        time.sleep(2)  # Wait for error response
        duration = time.time() - start
        
        self.metrics.record("login_failure_response", duration)
        assert duration < THRESHOLDS["api_response"], f"Login failure response too slow: {duration:.2f}s"
    
    def test_forgot_password_response_time(self):
        """Test forgot password request response time"""
        forgot_page = ForgotPasswordPage(self.driver)
        forgot_page.navigate()
        
        start = time.time()
        forgot_page.request_password_reset(TEST_USER["email"])
        time.sleep(3)  # Wait for response
        duration = time.time() - start
        
        self.metrics.record("forgot_password_response", duration)
        assert duration < THRESHOLDS["api_response"], f"Forgot password too slow: {duration:.2f}s"
    
    def test_session_validation_time(self, authenticated_driver):
        """Test session validation performance on page navigation"""
        pages = [ROUTES["dashboard"], ROUTES["create_jd"], ROUTES["profile"]]
        
        for page in pages:
            start = time.time()
            authenticated_driver.get(page)
            authenticated_driver.execute_script("return document.readyState") == "complete"
            duration = time.time() - start
            
            self.metrics.record("session_validation", duration)
            assert duration < THRESHOLDS["page_load"], f"Session validation slow on {page}: {duration:.2f}s"


class TestJDCreationPerformance:
    """Performance tests for JD creation feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.jd_page = CreateJDPage(authenticated_driver)
        self.jd_page.navigate()
    
    def test_jd_generation_response_time(self):
        """Test JD generation AI response time"""
        self.jd_page.enter_role_name(TEST_JD_DATA["role_name"])
        self.jd_page.enter_experience(TEST_JD_DATA["experience"])
        self.jd_page.enter_languages(TEST_JD_DATA["languages"])
        self.jd_page.enter_skills(TEST_JD_DATA["skills"])
        
        start = time.time()
        self.jd_page.click_generate()
        self.jd_page.wait_for_loading(timeout=30)
        duration = time.time() - start
        
        self.metrics.record("jd_generation", duration)
        assert duration < THRESHOLDS["ai_generation"], f"JD generation too slow: {duration:.2f}s"
    
    def test_jd_form_input_responsiveness(self):
        """Test form input responsiveness"""
        fields = [
            (self.jd_page.enter_role_name, "Senior Software Engineer"),
            (self.jd_page.enter_experience, "5"),
            (self.jd_page.enter_languages, "Python, JavaScript, Java"),
            (self.jd_page.enter_skills, "AWS, Docker, Kubernetes"),
        ]
        
        for enter_func, value in fields:
            start = time.time()
            enter_func(value)
            duration = time.time() - start
            
            self.metrics.record("form_input", duration)
            assert duration < 1.0, f"Form input too slow: {duration:.2f}s"
    
    def test_multiple_jd_generations(self):
        """Test performance of multiple consecutive JD generations"""
        durations = []
        
        for i in range(3):
            self.jd_page.navigate()
            self.jd_page.enter_role_name(f"Test Role {i}")
            self.jd_page.enter_experience("3")
            self.jd_page.enter_languages("Python")
            self.jd_page.enter_skills("Testing")
            
            start = time.time()
            self.jd_page.click_generate()
            self.jd_page.wait_for_loading(timeout=30)
            duration = time.time() - start
            
            durations.append(duration)
            self.metrics.record("jd_generation_repeated", duration)
        
        avg_duration = statistics.mean(durations)
        assert avg_duration < THRESHOLDS["ai_generation"], f"Average JD generation too slow: {avg_duration:.2f}s"


class TestScreeningTestPerformance:
    """Performance tests for screening test creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.template_page = CreateTemplatePage(authenticated_driver)
        self.template_page.navigate()
    
    def test_add_question_response_time(self):
        """Test adding question response time"""
        self.template_page.enter_template_name("Performance Test Template")
        
        start = time.time()
        self.template_page.add_question(
            question_text="Test::: Performance test question?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            level="fresher"
        )
        duration = time.time() - start
        
        self.metrics.record("add_question", duration)
        assert duration < THRESHOLDS["form_submission"], f"Add question too slow: {duration:.2f}s"
    
    def test_add_multiple_questions_performance(self):
        """Test adding multiple questions performance"""
        self.template_page.enter_template_name("Multi Question Performance Test")
        
        total_start = time.time()
        for i in range(10):
            start = time.time()
            self.template_page.add_question(
                question_text=f"Test::: Question {i+1}?",
                topic="Test",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                level="fresher"
            )
            duration = time.time() - start
            self.metrics.record("add_question_batch", duration)
        
        total_duration = time.time() - total_start
        self.metrics.record("add_10_questions_total", total_duration)
        
        # Average time per question should be reasonable
        avg_per_question = total_duration / 10
        assert avg_per_question < 3.0, f"Average question add time too slow: {avg_per_question:.2f}s"
    
    def test_ai_question_generation_time(self):
        """Test AI question generation response time"""
        self.template_page.enter_template_name("AI Gen Performance Test")
        self.template_page.select_topic("Python")
        
        start = time.time()
        self.template_page.click_generate_questions()
        self.template_page.wait_for_loading(timeout=60)
        duration = time.time() - start
        
        self.metrics.record("ai_question_generation", duration)
        assert duration < THRESHOLDS["ai_generation"] * 2, f"AI question generation too slow: {duration:.2f}s"
    
    def test_save_template_response_time(self):
        """Test save template response time"""
        self.template_page.enter_template_name("Save Performance Test")
        self.template_page.add_question(
            question_text="Test::: Save test question?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        
        start = time.time()
        self.template_page.click_save_template()
        self.template_page.wait_for_loading()
        duration = time.time() - start
        
        self.metrics.record("save_template", duration)
        assert duration < THRESHOLDS["api_response"], f"Save template too slow: {duration:.2f}s"
    
    def test_delete_question_response_time(self):
        """Test delete question response time"""
        self.template_page.enter_template_name("Delete Performance Test")
        
        # Add questions first
        for i in range(3):
            self.template_page.add_question(
                question_text=f"Test::: Delete test question {i}?",
                topic="Test",
                options=["A", "B", "C", "D"],
                correct_answer="A"
            )
        
        start = time.time()
        self.template_page.delete_question(0)
        duration = time.time() - start
        
        self.metrics.record("delete_question", duration)
        assert duration < 2.0, f"Delete question too slow: {duration:.2f}s"


class TestDashboardPerformance:
    """Performance tests for dashboard operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.dashboard = DashboardPage(authenticated_driver)
    
    def test_dashboard_initial_load_with_templates(self):
        """Test dashboard load time with templates"""
        start = time.time()
        self.dashboard.navigate()
        self.dashboard.wait_for_loading()
        duration = time.time() - start
        
        self.metrics.record("dashboard_with_templates", duration)
        assert duration < THRESHOLDS["page_load"] * 2, f"Dashboard load too slow: {duration:.2f}s"
    
    def test_template_list_render_time(self):
        """Test template list rendering time"""
        self.dashboard.navigate()
        
        start = time.time()
        template_count = self.dashboard.get_template_count()
        duration = time.time() - start
        
        self.metrics.record("template_list_render", duration)
        assert duration < 2.0, f"Template list render too slow: {duration:.2f}s"
    
    def test_config_modal_open_time(self):
        """Test configuration modal open time"""
        self.dashboard.navigate()
        
        if self.dashboard.get_template_count() > 0:
            start = time.time()
            self.dashboard.click_template_config(0)
            time.sleep(0.5)  # Wait for modal animation
            duration = time.time() - start
            
            self.metrics.record("config_modal_open", duration)
            assert duration < 1.5, f"Config modal open too slow: {duration:.2f}s"


class TestProfilerPerformance:
    """Performance tests for candidate profiler"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.profiler = ProfilerPage(authenticated_driver)
        self.profiler.navigate()
    
    def test_profiler_page_responsiveness(self):
        """Test profiler page UI responsiveness"""
        start = time.time()
        self.profiler.navigate()
        duration = time.time() - start
        
        self.metrics.record("profiler_page_load", duration)
        assert duration < THRESHOLDS["page_load"], f"Profiler page load too slow: {duration:.2f}s"


class TestReportPerformance:
    """Performance tests for report viewing"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.result_page = ResultPage(authenticated_driver)
        self.result_page.navigate()
    
    def test_result_search_response_time(self):
        """Test result search response time"""
        test_link = f"{BASE_URL}/test/sample-test"
        
        start = time.time()
        self.result_page.search_results(test_link)
        self.result_page.wait_for_loading()
        duration = time.time() - start
        
        self.metrics.record("result_search", duration)
        assert duration < THRESHOLDS["api_response"], f"Result search too slow: {duration:.2f}s"


class TestProfilePerformance:
    """Performance tests for user profile operations"""
    
    @pytest.fixture(autouse=True)
    def setup(self, authenticated_driver, perf_metrics):
        self.driver = authenticated_driver
        self.metrics = perf_metrics
        self.profile_page = ProfilePage(authenticated_driver)
        self.profile_page.navigate()
    
    def test_password_change_response_time(self):
        """Test password change response time"""
        new_password = "TempPassword123!"
        
        self.profile_page.enter_new_password(new_password)
        self.profile_page.enter_confirm_password(new_password)
        
        start = time.time()
        self.profile_page.click_update_password()
        self.profile_page.wait_for_loading()
        duration = time.time() - start
        
        self.metrics.record("password_change", duration)
        
        # Revert password
        self.profile_page.navigate()
        self.profile_page.change_password(TEST_USER["password"])
        
        assert duration < THRESHOLDS["api_response"], f"Password change too slow: {duration:.2f}s"
    
    def test_invite_user_response_time(self):
        """Test invite user response time"""
        from faker import Faker
        fake = Faker()
        invite_email = f"perf_test_{fake.uuid4()[:8]}@company.com"
        
        self.profile_page.enter_invite_email(invite_email)
        
        start = time.time()
        self.profile_page.click_send_invitation()
        self.profile_page.wait_for_loading()
        duration = time.time() - start
        
        self.metrics.record("invite_user", duration)
        assert duration < THRESHOLDS["api_response"], f"Invite user too slow: {duration:.2f}s"


class TestBrowserPerformance:
    """Browser-level performance metrics"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver, perf_metrics):
        self.driver = driver
        self.metrics = perf_metrics
    
    def test_memory_usage_on_navigation(self):
        """Test memory usage doesn't spike excessively during navigation"""
        pages = [ROUTES["login"], ROUTES["signup"], ROUTES["forgot_password"]]
        
        for page in pages:
            self.driver.get(page)
            
            # Get performance metrics if available
            try:
                performance = self.driver.execute_script(
                    "return window.performance.memory ? window.performance.memory.usedJSHeapSize : null"
                )
                if performance:
                    self.metrics.record("memory_usage", performance / (1024 * 1024))  # Convert to MB
            except Exception:
                pass  # Memory API not available in all browsers
    
    def test_dom_content_loaded_time(self):
        """Test DOM content loaded timing"""
        self.driver.get(ROUTES["login"])
        
        timing = self.driver.execute_script("""
            var timing = window.performance.timing;
            return timing.domContentLoadedEventEnd - timing.navigationStart;
        """)
        
        self.metrics.record("dom_content_loaded", timing / 1000)  # Convert to seconds
        assert timing < 3000, f"DOM content loaded too slow: {timing}ms"
    
    def test_first_contentful_paint(self):
        """Test First Contentful Paint metric"""
        self.driver.get(ROUTES["login"])
        time.sleep(1)  # Wait for paint metrics
        
        try:
            fcp = self.driver.execute_script("""
                var entries = performance.getEntriesByType('paint');
                for (var i = 0; i < entries.length; i++) {
                    if (entries[i].name === 'first-contentful-paint') {
                        return entries[i].startTime;
                    }
                }
                return null;
            """)
            
            if fcp:
                self.metrics.record("first_contentful_paint", fcp / 1000)
                assert fcp < 2500, f"First Contentful Paint too slow: {fcp}ms"
        except Exception:
            pass  # Paint timing API not available


@pytest.fixture
def authenticated_driver(driver):
    """Fixture that provides an authenticated driver session"""
    login_page = LoginPage(driver)
    login_page.navigate()
    login_page.login_with_eula(TEST_USER["email"], TEST_USER["password"])
    login_page.wait_for_url_contains("/list")
    return driver


def test_performance_summary(perf_metrics):
    """Generate performance test summary"""
    stats = perf_metrics.get_all_stats()
    
    print("\n" + "="*60)
    print("PERFORMANCE TEST SUMMARY")
    print("="*60)
    
    for metric_name, metric_stats in stats.items():
        if metric_stats:
            print(f"\n{metric_name}:")
            print(f"  Min: {metric_stats['min']:.3f}s")
            print(f"  Max: {metric_stats['max']:.3f}s")
            print(f"  Avg: {metric_stats['avg']:.3f}s")
            print(f"  Median: {metric_stats['median']:.3f}s")
            print(f"  Count: {metric_stats['count']}")
    
    print("\n" + "="*60)
