"""
Test Suite: Candidate Profiling
Tests all candidate profiling scenarios
"""
import pytest
import os
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.profiler_page import ProfilerPage
from config import TEST_USER, ROUTES


class TestCandidateProfiling:
    """Test cases for candidate profiling functionality"""
    
    # Test file paths - use os.path.abspath to get canonical paths (Chrome requires this)
    TEST_JD_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_data", "sample_jd.pdf"))
    TEST_RESUME_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "test_data", "sample_resume.pdf"))
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to profiler page"""
        self.driver = driver
        
        # Login first (with EULA acceptance)
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login_with_eula(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to profiler
        self.profiler_page = ProfilerPage(driver)
        self.profiler_page.navigate()
    
    def test_profiler_page_loads(self):
        """Verify profiler page loads correctly"""
        assert "/profilerPage" in self.driver.current_url
        assert self.profiler_page.is_element_visible(ProfilerPage.JD_UPLOAD_INPUT) or \
               self.profiler_page.is_element_visible(ProfilerPage.JD_UPLOAD_LABEL)
        assert self.profiler_page.is_element_visible(ProfilerPage.RESUME_UPLOAD_INPUT) or \
               self.profiler_page.is_element_visible(ProfilerPage.RESUME_UPLOAD_LABEL)
    
    @pytest.mark.skipif(not os.path.exists(TEST_JD_FILE), reason="Test JD file not found")
    def test_upload_jd_file(self):
        """Test uploading JD PDF file"""
        self.profiler_page.upload_jd(self.TEST_JD_FILE)
        
        # Should show file name or indication of upload
        assert self.profiler_page.is_jd_uploaded()
    
    @pytest.mark.skipif(not os.path.exists(TEST_RESUME_FILE), reason="Test resume file not found")
    def test_upload_resume_file(self):
        """Test uploading resume PDF file"""
        self.profiler_page.upload_resume(self.TEST_RESUME_FILE)
        
        # Should show file name or indication of upload
        assert self.profiler_page.is_resume_uploaded()
    
    @pytest.mark.skipif(
        not os.path.exists(TEST_JD_FILE) or not os.path.exists(TEST_RESUME_FILE),
        reason="Test files not found"
    )
    def test_generate_profile_report(self):
        """Test generating profile report with JD and resume"""
        self.profiler_page.generate_profile_report(self.TEST_JD_FILE, self.TEST_RESUME_FILE)
        
        # Wait for report generation
        self.profiler_page.wait_for_loading(timeout=30)
        
        # Should show report
        assert self.profiler_page.is_report_generated()
    
    @pytest.mark.skipif(
        not os.path.exists(TEST_JD_FILE) or not os.path.exists(TEST_RESUME_FILE),
        reason="Test files not found"
    )
    def test_report_shows_suitability_score(self):
        """Test that report shows suitability score"""
        self.profiler_page.generate_profile_report(self.TEST_JD_FILE, self.TEST_RESUME_FILE)
        self.profiler_page.wait_for_loading(timeout=30)
        
        score = self.profiler_page.get_suitability_score()
        assert score is not None
    
    @pytest.mark.skipif(
        not os.path.exists(TEST_JD_FILE) or not os.path.exists(TEST_RESUME_FILE),
        reason="Test files not found"
    )
    def test_report_shows_print_button(self):
        """Test that print button appears after report generation"""
        self.profiler_page.generate_profile_report(self.TEST_JD_FILE, self.TEST_RESUME_FILE)
        self.profiler_page.wait_for_loading(timeout=30)
        
        assert self.profiler_page.is_print_button_visible()
    
    @pytest.mark.skipif(
        not os.path.exists(TEST_JD_FILE) or not os.path.exists(TEST_RESUME_FILE),
        reason="Test files not found"
    )
    def test_report_content_sections(self):
        """Test that report contains expected sections"""
        self.profiler_page.generate_profile_report(self.TEST_JD_FILE, self.TEST_RESUME_FILE)
        self.profiler_page.wait_for_loading(timeout=30)
        
        content = self.profiler_page.get_report_content()
        assert content is not None
        # Report should contain key sections
        # Actual content depends on implementation
    
    def test_generate_without_jd(self):
        """Test generating report without JD file"""
        if os.path.exists(self.TEST_RESUME_FILE):
            self.profiler_page.upload_resume(self.TEST_RESUME_FILE)
        
        self.profiler_page.click_generate()
        
        # Should show error or not generate
        assert not self.profiler_page.is_report_generated()
    
    def test_generate_without_resume(self):
        """Test generating report without resume file"""
        if os.path.exists(self.TEST_JD_FILE):
            self.profiler_page.upload_jd(self.TEST_JD_FILE)
        
        self.profiler_page.click_generate()
        
        # Should show error or not generate
        assert not self.profiler_page.is_report_generated()
    
    def test_generate_without_files(self):
        """Test generating report without any files"""
        self.profiler_page.click_generate()
        
        # Should show error or not generate
        assert not self.profiler_page.is_report_generated()
    
    def test_back_button(self):
        """Test back button navigation"""
        self.profiler_page.click_back()
        
        assert "/list" in self.driver.current_url
    
    def test_navigate_from_dashboard(self):
        """Test navigating to profiler from dashboard"""
        dashboard = DashboardPage(self.driver)
        dashboard.navigate()
        dashboard.click_candidate_profiler()
        
        assert "/profilerPage" in self.driver.current_url


# Create test data directory and sample files for testing
def create_test_data_files():
    """Create sample test data files"""
    test_data_dir = os.path.join(os.path.dirname(__file__), "..", "test_data")
    os.makedirs(test_data_dir, exist_ok=True)
    
    # Note: Actual PDF files need to be created manually or using a PDF library
    # This is just a placeholder to show the expected structure
    print(f"Test data directory: {test_data_dir}")
    print("Please add sample_jd.pdf and sample_resume.pdf to this directory for full testing")
