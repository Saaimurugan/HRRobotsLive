"""
Test Suite: Create Template from Job Description
Tests all JD-based template creation scenarios
"""
import pytest
from faker import Faker
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.create_template_page import CreateTemplatePage
from pages.create_template_from_jd_page import CreateTemplateFromJDPage
from config import TEST_USER, ROUTES

fake = Faker()

# Sample JD text for testing
SAMPLE_JD_TEXT = """
Senior Software Engineer - Full Stack

We are looking for a Senior Software Engineer to join our team.

Requirements:
- 5+ years of experience in software development
- Strong proficiency in Python and JavaScript
- Experience with React.js and Node.js
- Knowledge of SQL and NoSQL databases
- Experience with AWS services (EC2, S3, Lambda)
- Familiarity with Docker and Kubernetes
- Understanding of CI/CD pipelines
- Excellent problem-solving skills
- Strong communication skills

Responsibilities:
- Design and develop scalable web applications
- Write clean, maintainable code
- Collaborate with cross-functional teams
- Participate in code reviews
- Mentor junior developers
"""

MINIMAL_JD_TEXT = """
Software Developer

Requirements:
- Python programming
- SQL databases
- REST APIs
"""


class TestJDTemplateCreation:
    """Test cases for creating templates from Job Descriptions"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to create template from JD page"""
        self.driver = driver
        
        # Login first
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to create template from JD
        self.jd_page = CreateTemplateFromJDPage(driver)
        self.jd_page.navigate()
    
    def test_page_loads_correctly(self):
        """Verify create template from JD page loads correctly"""
        assert "/createTemplateFromJD" in self.driver.current_url
        assert "Job Description" in self.jd_page.get_page_title()
    
    def test_step_indicator_shows_step_1(self):
        """Verify step indicator shows step 1 as active"""
        assert self.jd_page.get_current_step() >= 1
    
    def test_jd_textarea_is_visible(self):
        """Verify JD textarea is visible on step 1"""
        assert self.jd_page.is_element_visible(CreateTemplateFromJDPage.JD_TEXT_AREA)
    
    def test_extract_button_disabled_without_text(self):
        """Verify extract keywords button is disabled without JD text"""
        self.jd_page.enter_jd_text("")
        assert not self.jd_page.is_extract_button_enabled()
    
    def test_extract_button_enabled_with_text(self):
        """Verify extract keywords button is enabled with JD text"""
        self.jd_page.enter_jd_text(SAMPLE_JD_TEXT)
        assert self.jd_page.is_extract_button_enabled()
    
    def test_enter_jd_text(self):
        """Test entering JD text manually"""
        self.jd_page.enter_jd_text(SAMPLE_JD_TEXT)
        entered_text = self.jd_page.get_jd_text()
        assert SAMPLE_JD_TEXT in entered_text
    
    def test_extract_keywords_from_jd(self):
        """Test extracting keywords from JD text"""
        self.jd_page.enter_jd_text(SAMPLE_JD_TEXT)
        self.jd_page.click_extract_keywords()
        self.jd_page.wait_for_loading(timeout=30)
        
        keyword_count = self.jd_page.get_keyword_count()
        assert keyword_count > 0, "Should extract at least one keyword"
    
    def test_keywords_displayed_after_extraction(self):
        """Test that keywords are displayed after extraction"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        keywords = self.jd_page.get_keyword_names()
        assert len(keywords) > 0, "Should display extracted keywords"
        
        keywords_lower = [k.lower() for k in keywords]
        expected_keywords = ["python", "javascript", "react", "aws", "sql"]
        found_keywords = [k for k in expected_keywords if any(k in kw for kw in keywords_lower)]
        assert len(found_keywords) > 0, "Should find at least one expected keyword"
    
    def test_keywords_selected_by_default(self):
        """Test that keywords are selected by default"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        keyword_count = self.jd_page.get_keyword_count()
        for i in range(min(keyword_count, 3)):
            assert self.jd_page.is_keyword_selected(i), f"Keyword {i} should be selected by default"
    
    def test_toggle_keyword_selection(self):
        """Test toggling keyword selection"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_page.toggle_keyword(0)
        assert not self.jd_page.is_keyword_selected(0), "Keyword should be deselected"
        
        self.jd_page.toggle_keyword(0)
        assert self.jd_page.is_keyword_selected(0), "Keyword should be selected again"
    
    def test_adjust_question_count(self):
        """Test adjusting question count for keywords"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_page.set_question_count(0, 10)
        count = self.jd_page.get_question_count_for_keyword(0)
        assert count == 10, "Question count should be 10"
    
    def test_total_questions_updates(self):
        """Test that total questions badge updates correctly"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        initial_total = self.jd_page.get_total_questions()
        self.jd_page.toggle_keyword(0)
        new_total = self.jd_page.get_total_questions()
        
        assert new_total < initial_total, "Total should decrease when keyword deselected"
    
    def test_template_name_required(self):
        """Test that template name is required"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_page.click_generate_questions()
        assert self.jd_page.is_element_visible(CreateTemplateFromJDPage.KEYWORDS_SECTION)
    
    def test_generate_questions_shows_progress(self):
        """Test that question generation shows progress"""
        self.jd_page.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        template_name = f"Test Template {fake.uuid4()[:8]}"
        self.jd_page.enter_template_name(template_name)
        self.jd_page.click_generate_questions()
        
        assert self.jd_page.is_generation_in_progress() or \
               self.jd_page.is_element_visible(CreateTemplateFromJDPage.GENERATED_QUESTIONS_SECTION)
    
    def test_questions_generated_successfully(self):
        """Test that questions are generated successfully"""
        self.jd_page.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        template_name = f"Test Template {fake.uuid4()[:8]}"
        self.jd_page.enter_template_name(template_name)
        
        self.jd_page.deselect_all_keywords()
        self.jd_page.toggle_keyword(0)
        self.jd_page.set_question_count(0, 5)
        
        self.jd_page.click_generate_questions()
        self.jd_page.wait_for_generation_complete(timeout=60)
        
        question_count = self.jd_page.get_generated_question_count()
        assert question_count > 0, "Should generate at least one question"
    
    def test_delete_generated_question(self):
        """Test deleting a generated question"""
        self.jd_page.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        template_name = f"Test Template {fake.uuid4()[:8]}"
        self.jd_page.enter_template_name(template_name)
        
        self.jd_page.deselect_all_keywords()
        self.jd_page.toggle_keyword(0)
        self.jd_page.set_question_count(0, 5)
        
        self.jd_page.click_generate_questions()
        self.jd_page.wait_for_generation_complete(timeout=60)
        
        initial_count = self.jd_page.get_generated_question_count()
        if initial_count > 0:
            self.jd_page.delete_question(0)
            new_count = self.jd_page.get_generated_question_count()
            assert new_count == initial_count - 1, "Question count should decrease by 1"
    
    def test_back_button_returns_to_previous(self):
        """Test back button returns to previous page"""
        self.jd_page.click_back()
        assert "/createTemplateFromJD" not in self.driver.current_url
    
    def test_navigate_from_create_template_page(self):
        """Test navigating to create template from JD from create template page"""
        template_page = CreateTemplatePage(self.driver)
        template_page.navigate()
        
        template_page.click_jd_template()
        
        assert "/createTemplateFromJD" in self.driver.current_url
    
    def test_question_count_limits(self):
        """Test question count min/max limits"""
        self.jd_page.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_page.set_question_count(0, 0)
        count = self.jd_page.get_question_count_for_keyword(0)
        assert count >= 1, "Question count should not go below 1"
        
        self.jd_page.set_question_count(0, 25)
        count = self.jd_page.get_question_count_for_keyword(0)
        assert count <= 20, "Question count should not exceed 20"
