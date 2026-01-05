"""
Create JD Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import ROUTES


class CreateJDPage(BasePage):
    """Page object for Create JD page"""
    
    # Locators
    BACK_BUTTON = (By.CSS_SELECTOR, "button.modern-button--outline")
    ROLE_NAME_INPUT = (By.NAME, "roleName")
    EXPERIENCE_INPUT = (By.NAME, "yearsOfExperience")
    PROJECT_DETAILS_TEXTAREA = (By.NAME, "projectDetails")
    LANGUAGES_INPUT = (By.NAME, "languages")
    SKILLS_INPUT = (By.NAME, "additionalSkills")
    GENERATE_BUTTON = (By.CSS_SELECTOR, "button.submit-btn")
    PRINT_BUTTON = (By.CSS_SELECTOR, "button.print-btn")
    GENERATED_CONTENT = (By.ID, "printableContent")
    JD_CONTENT = (By.CSS_SELECTOR, "div.jd-content")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["create_jd"]
    
    def navigate(self):
        """Navigate to create JD page"""
        self.navigate_to(self.url)
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
    
    def enter_role_name(self, role_name):
        """Enter role name"""
        self.send_keys(self.ROLE_NAME_INPUT, role_name)
    
    def enter_experience(self, years):
        """Enter years of experience"""
        self.send_keys(self.EXPERIENCE_INPUT, str(years))
    
    def enter_project_details(self, details):
        """Enter project details"""
        self.send_keys(self.PROJECT_DETAILS_TEXTAREA, details)
    
    def enter_languages(self, languages):
        """Enter programming languages"""
        self.send_keys(self.LANGUAGES_INPUT, languages)
    
    def enter_skills(self, skills):
        """Enter additional skills"""
        self.send_keys(self.SKILLS_INPUT, skills)
    
    def click_generate(self):
        """Click generate button"""
        self.click(self.GENERATE_BUTTON)
    
    def click_print(self):
        """Click print button"""
        self.click(self.PRINT_BUTTON)
    
    def create_jd(self, role_name, experience, languages, skills, project_details=""):
        """Create a job description"""
        self.enter_role_name(role_name)
        self.enter_experience(experience)
        if project_details:
            self.enter_project_details(project_details)
        self.enter_languages(languages)
        self.enter_skills(skills)
        self.click_generate()
    
    def is_jd_generated(self):
        """Check if JD is generated"""
        return self.is_element_visible(self.GENERATED_CONTENT)
    
    def get_generated_content(self):
        """Get generated JD content"""
        if self.is_jd_generated():
            return self.get_text(self.GENERATED_CONTENT)
        return None
    
    def is_print_button_visible(self):
        """Check if print button is visible"""
        return self.is_element_visible(self.PRINT_BUTTON)
    
    def is_generate_button_enabled(self):
        """Check if generate button is enabled"""
        button = self.find_element(self.GENERATE_BUTTON)
        return button.is_enabled()
