"""
Create Template Page Object
"""
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import Select
from pages.base_page import BasePage
from config import ROUTES
import time


class CreateTemplatePage(BasePage):
    """Page object for Create Template page"""
    
    # Locators
    BACK_BUTTON = (By.CSS_SELECTOR, "button.modern-button--outline")
    TEMPLATE_NAME_INPUT = (By.CSS_SELECTOR, "input[placeholder*='Template']")
    QUESTION_TEXTAREA = (By.CSS_SELECTOR, "textarea")
    TOPIC_COMBOBOX = (By.CSS_SELECTOR, "input.topic-combobox-input")
    TOPIC_DROPDOWN = (By.CSS_SELECTOR, "ul.topic-combobox-dropdown")
    TOPIC_OPTIONS = (By.CSS_SELECTOR, "li.topic-combobox-option")
    DIFFICULTY_SELECT = (By.XPATH, "//select[contains(@name, 'level') or contains(@id, 'level')]")
    OPTION_INPUTS = (By.CSS_SELECTOR, "input[placeholder*='Option']")
    CORRECT_ANSWER_SELECT = (By.XPATH, "//select[contains(@name, 'correct') or contains(@id, 'correct')]")
    ADD_QUESTION_BUTTON = (By.XPATH, "//button[contains(., 'Add')]")
    GENERATE_QUESTIONS_BUTTON = (By.XPATH, "//button[contains(., 'Generate')]")
    SAVE_TEMPLATE_BUTTON = (By.XPATH, "//button[contains(., 'Save')]")
    QUESTION_LIST = (By.CSS_SELECTOR, "div.question-list")
    QUESTION_ITEMS = (By.CSS_SELECTOR, "div.question-item")
    QUESTION_TEXT = (By.CSS_SELECTOR, "div.question-text")
    QUESTION_OPTIONS = (By.CSS_SELECTOR, "div.question-options")
    EDIT_QUESTION_BUTTON = (By.XPATH, ".//button[1]")
    DELETE_QUESTION_BUTTON = (By.XPATH, ".//button[2]")
    GROUP_BY_TOPIC_TOGGLE = (By.CSS_SELECTOR, "input[type='checkbox']")
    SUCCESS_TOAST = (By.CSS_SELECTOR, "div.toast.success")
    
    def __init__(self, driver):
        super().__init__(driver)
        self.url = ROUTES["create_template"]
    
    def navigate(self):
        """Navigate to create template page"""
        self.navigate_to(self.url)
    
    def click_back(self):
        """Click back button"""
        self.click(self.BACK_BUTTON)
    
    def enter_template_name(self, name):
        """Enter template name"""
        self.send_keys(self.TEMPLATE_NAME_INPUT, name)
    
    def enter_question(self, question_text):
        """Enter question text"""
        self.send_keys(self.QUESTION_TEXTAREA, question_text)
    
    def select_topic(self, topic):
        """Select or enter topic"""
        topic_input = self.find_element(self.TOPIC_COMBOBOX)
        topic_input.clear()
        topic_input.send_keys(topic)
        time.sleep(0.5)
        # Try to select from dropdown if available
        if self.is_element_visible(self.TOPIC_DROPDOWN):
            options = self.find_elements(self.TOPIC_OPTIONS)
            for option in options:
                if topic.lower() in option.text.lower():
                    option.click()
                    return
    
    def select_difficulty(self, level):
        """Select difficulty level"""
        try:
            select_element = self.find_element(self.DIFFICULTY_SELECT)
            select = Select(select_element)
            select.select_by_value(level)
        except:
            pass
    
    def enter_options(self, options):
        """Enter question options"""
        option_inputs = self.find_elements(self.OPTION_INPUTS)
        for i, option in enumerate(options):
            if i < len(option_inputs):
                option_inputs[i].clear()
                option_inputs[i].send_keys(option)
    
    def select_correct_answer(self, answer):
        """Select correct answer"""
        try:
            select_element = self.find_element(self.CORRECT_ANSWER_SELECT)
            select = Select(select_element)
            select.select_by_visible_text(answer)
        except:
            pass
    
    def click_add_question(self):
        """Click add question button"""
        self.click(self.ADD_QUESTION_BUTTON)
    
    def click_generate_questions(self):
        """Click generate questions button"""
        self.click(self.GENERATE_QUESTIONS_BUTTON)
    
    def click_save_template(self):
        """Click save template button"""
        self.click(self.SAVE_TEMPLATE_BUTTON)
    
    def add_question(self, question_text, topic, options, correct_answer, level="fresher"):
        """Add a complete question"""
        self.enter_question(question_text)
        self.select_topic(topic)
        self.select_difficulty(level)
        self.enter_options(options)
        self.select_correct_answer(correct_answer)
        self.click_add_question()
        time.sleep(0.5)
    
    def create_template(self, name, questions):
        """Create a complete template with questions"""
        self.enter_template_name(name)
        for q in questions:
            self.add_question(
                q["text"],
                q.get("topic", "General"),
                q["options"],
                q["correct"],
                q.get("level", "fresher")
            )
        self.click_save_template()
    
    def get_question_count(self):
        """Get number of questions added"""
        return len(self.find_elements(self.QUESTION_ITEMS))
    
    def get_question_items(self):
        """Get all question items"""
        return self.find_elements(self.QUESTION_ITEMS)
    
    def delete_question(self, index=0):
        """Delete question at index"""
        items = self.get_question_items()
        if index < len(items):
            delete_btn = items[index].find_element(*self.DELETE_QUESTION_BUTTON)
            delete_btn.click()
    
    def edit_question(self, index=0):
        """Edit question at index"""
        items = self.get_question_items()
        if index < len(items):
            edit_btn = items[index].find_element(*self.EDIT_QUESTION_BUTTON)
            edit_btn.click()
    
    def toggle_group_by_topic(self):
        """Toggle group by topic"""
        self.click(self.GROUP_BY_TOPIC_TOGGLE)
    
    def is_template_saved(self):
        """Check if template was saved successfully"""
        toast = self.get_toast_message()
        return toast and "saved" in toast.lower()
    
    def is_question_list_visible(self):
        """Check if question list is visible"""
        return self.is_element_visible(self.QUESTION_LIST)
