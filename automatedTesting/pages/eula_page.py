"""
EULA Page Object
"""
from selenium.webdriver.common.by import By
from pages.base_page import BasePage
from config import BASE_URL


class EULAPage(BasePage):
    """Page object for End User License Agreement page"""
    
    # Locators
    PAGE_TITLE = (By.CSS_SELECTOR, "h1")
    LAST_UPDATED = (By.CSS_SELECTOR, "p")
    SECTION_TITLES = (By.CSS_SELECTOR, "h2")
    IMPORTANT_BOX = (By.CSS_SELECTOR, "div[style*='background: rgb(255, 243, 205)']")
    CONTACT_EMAIL = (By.CSS_SELECTOR, "a[href='mailto:bot@hrrobots.com']")
    CONTACT_WEBSITE = (By.CSS_SELECTOR, "a[href='https://www.hrrobots.com']")
    AGREEMENT_BOX = (By.CSS_SELECTOR, "div[style*='background: rgb(232, 245, 233)']")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = f"{BASE_URL}/eula"
    
    def navigate(self):
        """Navigate to EULA page"""
        self.navigate_to(self.url)
    
    def get_page_title(self):
        """Get the main page title"""
        return self.get_text(self.PAGE_TITLE)
    
    def is_page_loaded(self):
        """Check if EULA page is loaded correctly"""
        return self.is_element_visible(self.PAGE_TITLE) and \
               "eula" in self.driver.current_url.lower()
    
    def get_section_titles(self):
        """Get all section titles on the page"""
        elements = self.find_elements(self.SECTION_TITLES)
        return [el.text for el in elements]
    
    def get_section_count(self):
        """Get the number of sections on the page"""
        elements = self.find_elements(self.SECTION_TITLES)
        return len(elements)
    
    def is_important_notice_visible(self):
        """Check if the important notice box is visible"""
        return self.is_element_visible(self.IMPORTANT_BOX)
    
    def is_contact_info_visible(self):
        """Check if contact information is visible"""
        return self.is_element_visible(self.CONTACT_EMAIL) and \
               self.is_element_visible(self.CONTACT_WEBSITE)
    
    def get_contact_email(self):
        """Get the contact email address"""
        link = self.find_element(self.CONTACT_EMAIL)
        href = link.get_attribute("href")
        return href.replace("mailto:", "") if href else None
    
    def click_contact_email(self):
        """Click the contact email link"""
        self.click(self.CONTACT_EMAIL)
    
    def click_contact_website(self):
        """Click the contact website link"""
        self.click(self.CONTACT_WEBSITE)
    
    def is_agreement_acknowledgment_visible(self):
        """Check if the agreement acknowledgment box is visible"""
        return self.is_element_visible(self.AGREEMENT_BOX)
    
    def scroll_to_bottom(self):
        """Scroll to the bottom of the EULA page"""
        super().scroll_to_bottom()
    
    def get_expected_sections(self):
        """Return the expected section titles for validation"""
        return [
            "1. Agreement to Terms",
            "2. License Grant",
            "3. Restrictions on Use",
            "4. Account Responsibilities",
            "5. Intellectual Property Rights",
            "6. Assessment and Proctoring",
            "7. Data Protection and Privacy",
            "8. Service Availability and Modifications",
            "9. Disclaimer of Warranties",
            "10. Limitation of Liability",
            "11. Indemnification",
            "12. Termination",
            "13. Governing Law and Dispute Resolution",
            "14. Changes to This Agreement",
            "15. Severability",
            "16. Entire Agreement",
            "17. Contact Information"
        ]
