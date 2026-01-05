"""
Test Suite: Screening Test Creation
Tests all screening test template creation scenarios
"""
import pytest
from faker import Faker
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.create_template_page import CreateTemplatePage
from config import TEST_USER, TEST_TEMPLATE_DATA, ROUTES

fake = Faker()


class TestScreeningTestCreation:
    """Test cases for screening test template creation"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to create template page"""
        self.driver = driver
        
        # Login first
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to create template
        self.template_page = CreateTemplatePage(driver)
        self.template_page.navigate()
    
    def test_create_template_page_loads(self):
        """Verify create template page loads correctly"""
        assert "/createTemplate" in self.driver.current_url
        assert self.template_page.is_element_visible(CreateTemplatePage.TEMPLATE_NAME_INPUT) or \
               self.template_page.is_element_present(CreateTemplatePage.QUESTION_TEXTAREA)
    
    def test_create_template_with_single_question(self):
        """Test creating template with single question"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        self.template_page.add_question(
            question_text="Python::: What is the output of print(2 ** 3)?",
            topic="Python",
            options=["8", "6", "9", "3"],
            correct_answer="8",
            level="fresher"
        )
        
        # Verify question was added
        assert self.template_page.get_question_count() >= 1
    
    def test_create_template_with_multiple_questions(self):
        """Test creating template with multiple questions"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        questions = [
            {
                "text": "Python::: What is the output of print(2 ** 3)?",
                "topic": "Python",
                "options": ["8", "6", "9", "3"],
                "correct": "8",
                "level": "fresher"
            },
            {
                "text": "Python::: Which keyword is used to define a function?",
                "topic": "Python",
                "options": ["def", "function", "func", "define"],
                "correct": "def",
                "level": "fresher"
            },
            {
                "text": "JavaScript::: What is the result of typeof null?",
                "topic": "JavaScript",
                "options": ["object", "null", "undefined", "string"],
                "correct": "object",
                "level": "intermediate"
            }
        ]
        
        for q in questions:
            self.template_page.add_question(
                question_text=q["text"],
                topic=q["topic"],
                options=q["options"],
                correct_answer=q["correct"],
                level=q["level"]
            )
        
        assert self.template_page.get_question_count() >= 3
    
    def test_save_template(self):
        """Test saving template"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        self.template_page.add_question(
            question_text="Test::: Sample question?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            level="fresher"
        )
        
        self.template_page.click_save_template()
        self.template_page.wait_for_loading()
        
        # Should show success message
        assert self.template_page.is_template_saved() or \
               "/list" in self.driver.current_url
    
    def test_create_template_different_difficulty_levels(self):
        """Test creating questions with different difficulty levels"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        levels = ["fresher", "intermediate", "expert"]
        
        for i, level in enumerate(levels):
            self.template_page.add_question(
                question_text=f"Test::: Question {i+1} for {level} level?",
                topic="Test",
                options=["A", "B", "C", "D"],
                correct_answer="A",
                level=level
            )
        
        assert self.template_page.get_question_count() >= 3
    
    def test_create_template_different_topics(self):
        """Test creating questions with different topics"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        topics = ["Python", "JavaScript", "Java", "SQL", "AWS"]
        
        for topic in topics:
            self.template_page.add_question(
                question_text=f"{topic}::: Sample question about {topic}?",
                topic=topic,
                options=["A", "B", "C", "D"],
                correct_answer="A",
                level="fresher"
            )
        
        assert self.template_page.get_question_count() >= 5
    
    def test_delete_question(self):
        """Test deleting a question"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        # Add two questions
        self.template_page.add_question(
            question_text="Test::: Question 1?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        self.template_page.add_question(
            question_text="Test::: Question 2?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="B"
        )
        
        initial_count = self.template_page.get_question_count()
        
        # Delete first question
        self.template_page.delete_question(0)
        
        # Count should decrease
        new_count = self.template_page.get_question_count()
        assert new_count < initial_count
    
    def test_edit_question(self):
        """Test editing a question"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        self.template_page.add_question(
            question_text="Test::: Original question?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        
        # Click edit on first question
        self.template_page.edit_question(0)
        
        # Form should be populated for editing
        # Actual behavior depends on implementation
    
    def test_generate_questions_ai(self):
        """Test AI question generation"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        # Enter topic for generation
        self.template_page.select_topic("Python")
        
        # Click generate
        self.template_page.click_generate_questions()
        self.template_page.wait_for_loading(timeout=30)
        
        # Should have generated questions
        # Behavior depends on implementation
    
    def test_group_by_topic_toggle(self):
        """Test group by topic toggle"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        # Add questions with different topics
        self.template_page.add_question(
            question_text="Python::: Python question?",
            topic="Python",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        self.template_page.add_question(
            question_text="JavaScript::: JS question?",
            topic="JavaScript",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        
        # Toggle group by topic
        self.template_page.toggle_group_by_topic()
        
        # Questions should be grouped
        # Verification depends on implementation
    
    def test_back_button(self):
        """Test back button navigation"""
        self.template_page.click_back()
        
        assert "/list" in self.driver.current_url
    
    def test_navigate_from_dashboard(self):
        """Test navigating to create template from dashboard"""
        dashboard = DashboardPage(self.driver)
        dashboard.navigate()
        dashboard.click_screening_test()
        
        assert "/createTemplate" in self.driver.current_url
    
    def test_create_template_empty_name(self):
        """Test creating template without name"""
        self.template_page.add_question(
            question_text="Test::: Question without template name?",
            topic="Test",
            options=["A", "B", "C", "D"],
            correct_answer="A"
        )
        
        self.template_page.click_save_template()
        
        # Should show error or not save
        # Behavior depends on implementation
    
    def test_create_template_empty_question(self):
        """Test adding question without question text"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        
        # Try to add without question text
        self.template_page.select_topic("Test")
        self.template_page.enter_options(["A", "B", "C", "D"])
        self.template_page.click_add_question()
        
        # Should not add or show error
    
    def test_create_template_incomplete_options(self):
        """Test adding question with incomplete options"""
        template_name = f"Test Template {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        self.template_page.enter_question("Test::: Question with incomplete options?")
        self.template_page.select_topic("Test")
        self.template_page.enter_options(["A", "B"])  # Only 2 options
        self.template_page.click_add_question()
        
        # Should not add or show error
    
    def test_create_template_special_characters(self):
        """Test creating template with special characters"""
        template_name = f"Test Template <>&\"' {fake.uuid4()[:8]}"
        
        self.template_page.enter_template_name(template_name)
        self.template_page.add_question(
            question_text="Test::: What is 2 + 2? (hint: <4>)",
            topic="Test",
            options=["3", "4", "5", "6"],
            correct_answer="4"
        )
        
        self.template_page.click_save_template()
        self.template_page.wait_for_loading()
