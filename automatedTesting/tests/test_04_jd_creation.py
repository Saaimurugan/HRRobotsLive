"""
Test Suite: JD (Job Description) Creation
Tests all JD creation scenarios
"""
import pytest
from pages.login_page import LoginPage
from pages.dashboard_page import DashboardPage
from pages.create_jd_page import CreateJDPage
from config import TEST_USER, TEST_JD_DATA, ROUTES


class TestJDCreation:
    """Test cases for JD creation functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self, driver):
        """Setup - login and navigate to create JD page"""
        self.driver = driver
        
        # Login first (with EULA acceptance)
        login_page = LoginPage(driver)
        login_page.navigate()
        login_page.login_with_eula(TEST_USER["email"], TEST_USER["password"])
        login_page.wait_for_url_contains("/list")
        
        # Navigate to create JD
        self.jd_page = CreateJDPage(driver)
        self.jd_page.navigate()
    
    def test_create_jd_page_loads(self):
        """Verify create JD page loads correctly"""
        assert "/createJD" in self.driver.current_url
        assert self.jd_page.is_element_visible(CreateJDPage.ROLE_NAME_INPUT)
        assert self.jd_page.is_element_visible(CreateJDPage.EXPERIENCE_INPUT)
        assert self.jd_page.is_element_visible(CreateJDPage.LANGUAGES_INPUT)
        assert self.jd_page.is_element_visible(CreateJDPage.SKILLS_INPUT)
    
    def test_create_jd_with_all_fields(self):
        """Test creating JD with all fields filled"""
        self.jd_page.create_jd(
            role_name=TEST_JD_DATA["role_name"],
            experience=TEST_JD_DATA["experience"],
            languages=TEST_JD_DATA["languages"],
            skills=TEST_JD_DATA["skills"]
        )
        
        # Wait for generation
        self.jd_page.wait_for_loading()
        
        # Should show generated content
        assert self.jd_page.is_jd_generated()
    
    def test_create_jd_shows_print_button(self):
        """Test that print button appears after JD generation"""
        self.jd_page.create_jd(
            role_name=TEST_JD_DATA["role_name"],
            experience=TEST_JD_DATA["experience"],
            languages=TEST_JD_DATA["languages"],
            skills=TEST_JD_DATA["skills"]
        )
        
        self.jd_page.wait_for_loading()
        
        assert self.jd_page.is_print_button_visible()
    
    def test_create_jd_generated_content_contains_role(self):
        """Test that generated JD contains the role name"""
        self.jd_page.create_jd(
            role_name=TEST_JD_DATA["role_name"],
            experience=TEST_JD_DATA["experience"],
            languages=TEST_JD_DATA["languages"],
            skills=TEST_JD_DATA["skills"]
        )
        
        self.jd_page.wait_for_loading()
        
        content = self.jd_page.get_generated_content()
        assert content is not None
        # Role name should appear in generated content
        assert TEST_JD_DATA["role_name"].lower() in content.lower() or \
               "software" in content.lower() or "engineer" in content.lower()
    
    def test_create_jd_with_project_details(self):
        """Test creating JD with project details"""
        project_details = "Building a scalable microservices architecture for e-commerce platform"
        
        self.jd_page.enter_role_name(TEST_JD_DATA["role_name"])
        self.jd_page.enter_experience(TEST_JD_DATA["experience"])
        self.jd_page.enter_project_details(project_details)
        self.jd_page.enter_languages(TEST_JD_DATA["languages"])
        self.jd_page.enter_skills(TEST_JD_DATA["skills"])
        self.jd_page.click_generate()
        
        self.jd_page.wait_for_loading()
        
        assert self.jd_page.is_jd_generated()
    
    def test_create_jd_empty_role_name(self):
        """Test creating JD without role name"""
        self.jd_page.enter_experience(TEST_JD_DATA["experience"])
        self.jd_page.enter_languages(TEST_JD_DATA["languages"])
        self.jd_page.enter_skills(TEST_JD_DATA["skills"])
        self.jd_page.click_generate()
        
        # Should not generate or show error
        # Behavior depends on implementation
    
    def test_create_jd_empty_experience(self):
        """Test creating JD without experience"""
        self.jd_page.enter_role_name(TEST_JD_DATA["role_name"])
        self.jd_page.enter_languages(TEST_JD_DATA["languages"])
        self.jd_page.enter_skills(TEST_JD_DATA["skills"])
        self.jd_page.click_generate()
        
        # Should not generate or show error
    
    def test_create_jd_empty_languages(self):
        """Test creating JD without languages"""
        self.jd_page.enter_role_name(TEST_JD_DATA["role_name"])
        self.jd_page.enter_experience(TEST_JD_DATA["experience"])
        self.jd_page.enter_skills(TEST_JD_DATA["skills"])
        self.jd_page.click_generate()
        
        # Should not generate or show error
    
    def test_create_jd_empty_skills(self):
        """Test creating JD without skills"""
        self.jd_page.enter_role_name(TEST_JD_DATA["role_name"])
        self.jd_page.enter_experience(TEST_JD_DATA["experience"])
        self.jd_page.enter_languages(TEST_JD_DATA["languages"])
        self.jd_page.click_generate()
        
        # Should not generate or show error
    
    def test_create_jd_back_button(self):
        """Test back button navigation"""
        self.jd_page.click_back()
        
        assert "/list" in self.driver.current_url
    
    def test_create_jd_different_experience_levels(self):
        """Test creating JD with different experience levels"""
        experience_levels = ["0", "2", "5", "10", "15"]
        
        for exp in experience_levels:
            self.jd_page.navigate()
            self.jd_page.create_jd(
                role_name=TEST_JD_DATA["role_name"],
                experience=exp,
                languages=TEST_JD_DATA["languages"],
                skills=TEST_JD_DATA["skills"]
            )
            
            self.jd_page.wait_for_loading()
            assert self.jd_page.is_jd_generated()
    
    def test_create_jd_various_roles(self):
        """Test creating JD for various roles"""
        roles = [
            "Frontend Developer",
            "Backend Developer",
            "DevOps Engineer",
            "Data Scientist",
            "Product Manager"
        ]
        
        for role in roles:
            self.jd_page.navigate()
            self.jd_page.create_jd(
                role_name=role,
                experience="3",
                languages="Python, JavaScript",
                skills="Communication, Problem Solving"
            )
            
            self.jd_page.wait_for_loading()
            assert self.jd_page.is_jd_generated()
    
    def test_create_jd_special_characters_in_role(self):
        """Test creating JD with special characters in role name"""
        self.jd_page.create_jd(
            role_name="Senior C++ Developer (Remote)",
            experience="5",
            languages="C++, Python",
            skills="STL, Boost"
        )
        
        self.jd_page.wait_for_loading()
        assert self.jd_page.is_jd_generated()
    
    def test_create_jd_long_skills_list(self):
        """Test creating JD with long skills list"""
        long_skills = "AWS, Azure, GCP, Docker, Kubernetes, Jenkins, Git, CI/CD, Terraform, Ansible, Python, Java, JavaScript, TypeScript, React, Angular, Vue, Node.js, Express, Django, Flask, PostgreSQL, MongoDB, Redis, Elasticsearch"
        
        self.jd_page.create_jd(
            role_name=TEST_JD_DATA["role_name"],
            experience=TEST_JD_DATA["experience"],
            languages=TEST_JD_DATA["languages"],
            skills=long_skills
        )
        
        self.jd_page.wait_for_loading()
        assert self.jd_page.is_jd_generated()
    
    def test_create_jd_from_dashboard(self):
        """Test navigating to create JD from dashboard"""
        dashboard = DashboardPage(self.driver)
        dashboard.navigate()
        dashboard.click_create_jd()
        
        assert "/createJD" in self.driver.current_url
