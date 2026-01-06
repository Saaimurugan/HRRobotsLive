"""
Test Suite: Create Template from Job Description Modal
Tests all JD-based template creation scenarios via modal
"""
import pytest
from faker import Faker
from pages.login_page import LoginPage
from pages.create_template_page import CreateTemplatePage
from pages.create_template_from_jd_page import CreateTemplateFromJDPage
from config import TEST_USER

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


class TestJDTemplateCreationModal:
    """Test cases for creating templates from Job Descriptions via modal"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to create template page"""
        self.driver = driver
        
        # Login first
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to create template page
        self.template_page = CreateTemplatePage(driver)
        self.template_page.navigate()
        
        # Initialize JD modal page object
        self.jd_modal = CreateTemplateFromJDPage(driver)
    
    def open_jd_modal(self):
        """Helper to open the JD modal"""
        self.template_page.click_jd_template()
        self.jd_modal.wait_for_modal()

    def test_modal_opens_correctly(self):
        """Verify JD modal opens when clicking Create from JD button"""
        self.open_jd_modal()
        assert self.jd_modal.is_modal_open(), "Modal should be open"
        assert "Job Description" in self.jd_modal.get_modal_title()
    
    def test_modal_closes_on_x_button(self):
        """Verify modal closes when clicking X button"""
        self.open_jd_modal()
        self.jd_modal.close_modal()
        assert not self.jd_modal.is_modal_open(), "Modal should be closed"
    
    def test_step_indicator_shows_step_1(self):
        """Verify step indicator shows step 1 as active"""
        self.open_jd_modal()
        assert self.jd_modal.get_current_step() >= 1
    
    def test_side_by_side_layout_visible(self):
        """Verify Upload and Paste sections are displayed side by side"""
        self.open_jd_modal()
        assert self.jd_modal.is_side_by_side_layout_visible(), "Side by side layout should be visible"
        assert self.jd_modal.is_upload_section_visible(), "Upload section should be visible"
        assert self.jd_modal.is_text_section_visible(), "Text section should be visible"
        assert self.jd_modal.is_divider_visible(), "OR divider should be visible"
    
    def test_jd_textarea_is_visible(self):
        """Verify JD textarea is visible on step 1"""
        self.open_jd_modal()
        assert self.jd_modal.is_element_visible(CreateTemplateFromJDPage.JD_TEXT_AREA)
    
    def test_pdf_upload_section_visible(self):
        """Verify PDF upload section is visible"""
        self.open_jd_modal()
        assert self.jd_modal.is_element_visible(CreateTemplateFromJDPage.UPLOAD_CARD)
        assert self.jd_modal.is_element_visible(CreateTemplateFromJDPage.PDF_UPLOAD_LABEL)
    
    def test_extract_button_disabled_without_text(self):
        """Verify extract keywords button is disabled without JD text"""
        self.open_jd_modal()
        self.jd_modal.enter_jd_text("")
        assert not self.jd_modal.is_extract_button_enabled()
    
    def test_extract_button_enabled_with_text(self):
        """Verify extract keywords button is enabled with JD text"""
        self.open_jd_modal()
        self.jd_modal.enter_jd_text(SAMPLE_JD_TEXT)
        assert self.jd_modal.is_extract_button_enabled()
    
    def test_enter_jd_text(self):
        """Test entering JD text manually"""
        self.open_jd_modal()
        self.jd_modal.enter_jd_text(SAMPLE_JD_TEXT)
        entered_text = self.jd_modal.get_jd_text()
        assert SAMPLE_JD_TEXT in entered_text
    
    def test_extract_keywords_from_jd(self):
        """Test extracting keywords from JD text"""
        self.open_jd_modal()
        self.jd_modal.enter_jd_text(SAMPLE_JD_TEXT)
        self.jd_modal.click_extract_keywords()
        self.jd_modal.wait_for_extraction_complete(timeout=30)
        
        keyword_count = self.jd_modal.get_keyword_count()
        assert keyword_count > 0, "Should extract at least one keyword"
    
    def test_keywords_displayed_after_extraction(self):
        """Test that keywords are displayed after extraction"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        keywords = self.jd_modal.get_keyword_names()
        assert len(keywords) > 0, "Should display extracted keywords"
        
        keywords_lower = [k.lower() for k in keywords]
        expected_keywords = ["python", "javascript", "react", "aws", "sql"]
        found_keywords = [k for k in expected_keywords if any(k in kw for kw in keywords_lower)]
        assert len(found_keywords) > 0, "Should find at least one expected keyword"
    
    def test_keywords_selected_by_default(self):
        """Test that keywords are selected by default"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        keyword_count = self.jd_modal.get_keyword_count()
        for i in range(min(keyword_count, 3)):
            assert self.jd_modal.is_keyword_selected(i), f"Keyword {i} should be selected by default"

    def test_toggle_keyword_selection(self):
        """Test toggling keyword selection"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_modal.toggle_keyword(0)
        assert not self.jd_modal.is_keyword_selected(0), "Keyword should be deselected"
        
        self.jd_modal.toggle_keyword(0)
        assert self.jd_modal.is_keyword_selected(0), "Keyword should be selected again"
    
    def test_adjust_question_count(self):
        """Test adjusting question count for keywords"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_modal.set_question_count(0, 10)
        count = self.jd_modal.get_question_count_for_keyword(0)
        assert count == 10, "Question count should be 10"
    
    def test_total_questions_updates(self):
        """Test that total questions badge updates correctly"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        initial_total = self.jd_modal.get_total_questions()
        self.jd_modal.toggle_keyword(0)
        new_total = self.jd_modal.get_total_questions()
        
        assert new_total < initial_total, "Total should decrease when keyword deselected"
    
    def test_generate_questions_shows_progress(self):
        """Test that question generation shows progress"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        self.jd_modal.deselect_all_keywords()
        self.jd_modal.toggle_keyword(0)
        self.jd_modal.set_question_count(0, 3)
        
        self.jd_modal.click_generate_questions()
        
        assert self.jd_modal.is_generation_in_progress() or \
               self.jd_modal.is_element_visible(CreateTemplateFromJDPage.GENERATED_QUESTIONS_SECTION)
    
    def test_questions_generated_successfully(self):
        """Test that questions are generated successfully"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        self.jd_modal.deselect_all_keywords()
        self.jd_modal.toggle_keyword(0)
        self.jd_modal.set_question_count(0, 3)
        
        self.jd_modal.click_generate_questions()
        self.jd_modal.wait_for_generation_complete(timeout=60)
        
        question_count = self.jd_modal.get_generated_question_count()
        assert question_count > 0, "Should generate at least one question"
    
    def test_delete_generated_question(self):
        """Test deleting a generated question"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        self.jd_modal.deselect_all_keywords()
        self.jd_modal.toggle_keyword(0)
        self.jd_modal.set_question_count(0, 3)
        
        self.jd_modal.click_generate_questions()
        self.jd_modal.wait_for_generation_complete(timeout=60)
        
        initial_count = self.jd_modal.get_generated_question_count()
        if initial_count > 0:
            self.jd_modal.delete_question(0)
            new_count = self.jd_modal.get_generated_question_count()
            assert new_count == initial_count - 1, "Question count should decrease by 1"
    
    def test_use_questions_button_appears(self):
        """Test that Use These Questions button appears after generation"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        self.jd_modal.deselect_all_keywords()
        self.jd_modal.toggle_keyword(0)
        self.jd_modal.set_question_count(0, 3)
        
        self.jd_modal.click_generate_questions()
        self.jd_modal.wait_for_generation_complete(timeout=60)
        
        assert self.jd_modal.is_use_questions_button_visible(), "Use Questions button should be visible"
    
    def test_back_button_returns_to_keywords(self):
        """Test back button returns to keywords step"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(MINIMAL_JD_TEXT)
        
        self.jd_modal.deselect_all_keywords()
        self.jd_modal.toggle_keyword(0)
        self.jd_modal.set_question_count(0, 3)
        
        self.jd_modal.click_generate_questions()
        self.jd_modal.wait_for_generation_complete(timeout=60)
        
        self.jd_modal.click_back()
        assert self.jd_modal.is_element_visible(CreateTemplateFromJDPage.KEYWORDS_SECTION)
    
    def test_question_count_limits(self):
        """Test question count min/max limits"""
        self.open_jd_modal()
        self.jd_modal.complete_step1_with_text(SAMPLE_JD_TEXT)
        
        self.jd_modal.set_question_count(0, 0)
        count = self.jd_modal.get_question_count_for_keyword(0)
        assert count >= 1, "Question count should not go below 1"
        
        self.jd_modal.set_question_count(0, 25)
        count = self.jd_modal.get_question_count_for_keyword(0)
        assert count <= 20, "Question count should not exceed 20"
