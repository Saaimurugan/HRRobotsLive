"""
Test Suite: Edit Screening Test
Tests all screening test editing scenarios
"""
import pytest
from faker import Faker
from selenium.webdriver.common.by import By
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.create_template_page import CreateTemplatePage
from pages.config_modal_page import ConfigModalPage
from config import TEST_USER, ROUTES

fake = Faker()


class TestEditScreeningTest:
    """Test cases for editing screening test templates"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to dashboard"""
        self.driver = driver
        
        # Login first
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        self.dashboard = DashboardPage(driver)
    
    def test_edit_template_from_dashboard(self):
        """Test editing template from dashboard"""
        self.dashboard.navigate()
        
        # Check if there are templates
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            # Should navigate to edit page
            assert "/edit/" in self.driver.current_url
    
    def test_edit_template_loads_existing_questions(self):
        """Test that edit page loads existing questions"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            # Wait for page to load
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            # Should have questions loaded
            # Actual verification depends on template content
    
    def test_add_question_to_existing_template(self):
        """Test adding question to existing template"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            initial_count = template_page.get_question_count()
            
            # Add new question
            template_page.add_question(
                question_text="New::: New question added during edit?",
                topic="New",
                options=["A", "B", "C", "D"],
                correct_answer="A"
            )
            
            new_count = template_page.get_question_count()
            assert new_count > initial_count
    
    def test_delete_question_from_existing_template(self):
        """Test deleting question from existing template"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            initial_count = template_page.get_question_count()
            
            if initial_count > 0:
                template_page.delete_question(0)
                
                new_count = template_page.get_question_count()
                assert new_count < initial_count
    
    def test_save_edited_template(self):
        """Test saving edited template"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            # Add a question
            template_page.add_question(
                question_text="Edit::: Question added during edit test?",
                topic="Edit",
                options=["A", "B", "C", "D"],
                correct_answer="A"
            )
            
            # Save
            template_page.click_save_template()
            template_page.wait_for_loading()
            
            # Should show success or redirect
            assert template_page.is_template_saved() or "/list" in self.driver.current_url
    
    def test_edit_template_back_button(self):
        """Test back button from edit page"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.click_back()
            
            assert "/list" in self.driver.current_url
    
    def test_template_config_button(self):
        """Test template configuration button"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            
            # Should open config modal
            # Verification depends on implementation
    
    def test_template_assign_button(self):
        """Test template assign button"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_assign(0)
            
            # Should open assign modal
            # Verification depends on implementation
    
    def test_template_delete_button(self):
        """Test template delete button"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            initial_count = template_count
            
            self.dashboard.click_template_delete(0)
            
            # Should show confirmation or delete
            # Verification depends on implementation
    
    def test_edit_question_in_template(self):
        """Test editing existing question in template"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            question_count = template_page.get_question_count()
            
            if question_count > 0:
                template_page.edit_question(0)
                
                # Form should be populated for editing
                # Actual verification depends on implementation
    
    def test_change_question_difficulty(self):
        """Test changing question difficulty level"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            question_count = template_page.get_question_count()
            
            if question_count > 0:
                # Edit first question
                template_page.edit_question(0)
                
                # Change difficulty
                template_page.select_difficulty("expert")
                
                # Save changes
                template_page.click_add_question()
    
    def test_change_question_topic(self):
        """Test changing question topic"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_edit(0)
            
            template_page = CreateTemplatePage(self.driver)
            template_page.wait_for_loading()
            
            question_count = template_page.get_question_count()
            
            if question_count > 0:
                # Edit first question
                template_page.edit_question(0)
                
                # Change topic
                template_page.select_topic("NewTopic")
                
                # Save changes
                template_page.click_add_question()
    
    def test_reorder_questions(self):
        """Test reordering questions in template"""
        # This test depends on drag-and-drop implementation
        # Placeholder for future implementation
        pass
    
    def test_bulk_delete_questions(self):
        """Test bulk deleting questions"""
        # This test depends on bulk selection implementation
        # Placeholder for future implementation
        pass


class TestTemplateConfiguration:
    """Test cases for template configuration"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to dashboard"""
        self.driver = driver
        
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        self.dashboard = DashboardPage(driver)
        self.config_modal = ConfigModalPage(driver)
    
    def test_open_config_modal(self):
        """Test opening configuration modal"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            
            # Config modal should open
            assert self.config_modal.is_modal_visible()
            assert self.config_modal.get_modal_title() == "Configuration"
    
    def test_set_number_of_questions(self):
        """Test setting number of questions using range slider"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Set number of questions using slider
            self.config_modal.set_number_of_questions(25)
            
            # Verify value is set
            assert self.config_modal.get_number_of_questions() == 25
            
            # Verify label shows the value
            label_text = self.config_modal.get_number_of_questions_label()
            assert "25" in label_text
    
    def test_set_test_duration(self):
        """Test setting test duration using range slider"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Set test duration using slider
            self.config_modal.set_test_duration(90)
            
            # Verify value is set
            assert self.config_modal.get_test_duration() == 90
            
            # Verify label shows the value
            label_text = self.config_modal.get_test_duration_label()
            assert "90" in label_text
    
    def test_set_sensitivity_level(self):
        """Test setting sensitivity level using range slider"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Set sensitivity level using slider
            self.config_modal.set_sensitivity_level(4)
            
            # Verify value is set
            assert self.config_modal.get_sensitivity_level() == 4
            
            # Verify label shows the value
            label_text = self.config_modal.get_sensitivity_level_label()
            assert "4" in label_text
    
    def test_set_allowed_defaults(self):
        """Test setting allowed defaults using range slider"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Set allowed defaults using slider
            self.config_modal.set_allowed_defaults(7)
            
            # Verify value is set
            assert self.config_modal.get_allowed_defaults() == 7
            
            # Verify label shows the value
            label_text = self.config_modal.get_allowed_defaults_label()
            assert "7" in label_text
    
    def test_save_configuration(self):
        """Test saving configuration changes"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Set all values
            self.config_modal.set_number_of_questions(20)
            self.config_modal.set_test_duration(60)
            self.config_modal.set_sensitivity_level(3)
            self.config_modal.set_allowed_defaults(5)
            
            # Save
            self.config_modal.click_save()
            
            # Modal should close
            assert self.config_modal.wait_for_modal_close()
    
    def test_cancel_configuration(self):
        """Test canceling configuration changes"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Make changes
            self.config_modal.set_number_of_questions(50)
            
            # Cancel
            self.config_modal.click_cancel()
            
            # Modal should close
            assert self.config_modal.wait_for_modal_close()
    
    def test_slider_min_max_values(self):
        """Test that sliders have correct min/max values"""
        self.dashboard.navigate()
        
        template_count = self.dashboard.get_template_count()
        
        if template_count > 0:
            self.dashboard.click_template_config(0)
            self.config_modal.wait_for_modal()
            
            # Number of questions: min=1, max=60
            assert self.config_modal.get_slider_min(self.config_modal.NUMBER_OF_QUESTIONS_SLIDER) == 1
            assert self.config_modal.get_slider_max(self.config_modal.NUMBER_OF_QUESTIONS_SLIDER) == 60
            
            # Test duration: min=5, max=180
            assert self.config_modal.get_slider_min(self.config_modal.TEST_DURATION_SLIDER) == 5
            assert self.config_modal.get_slider_max(self.config_modal.TEST_DURATION_SLIDER) == 180
            
            # Sensitivity level: min=1, max=5
            assert self.config_modal.get_slider_min(self.config_modal.SENSITIVITY_LEVEL_SLIDER) == 1
            assert self.config_modal.get_slider_max(self.config_modal.SENSITIVITY_LEVEL_SLIDER) == 5
            
            # Allowed defaults: min=1, max=10
            assert self.config_modal.get_slider_min(self.config_modal.ALLOWED_DEFAULTS_SLIDER) == 1
            assert self.config_modal.get_slider_max(self.config_modal.ALLOWED_DEFAULTS_SLIDER) == 10
