"""
Configuration settings for HR Robots Selenium Tests
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Base URLs
BASE_URL = os.getenv("BASE_URL", "https://www.hrrobots.click")

# Routes
ROUTES = {
    "login": f"{BASE_URL}/login",
    "signup": f"{BASE_URL}/signup",
    "forgot_password": f"{BASE_URL}/forgot-password",
    "dashboard": f"{BASE_URL}/list",
    "create_jd": f"{BASE_URL}/createJD",
    "profiler": f"{BASE_URL}/profilerPage",
    "create_template": f"{BASE_URL}/createTemplate",
    "result": f"{BASE_URL}/result",
    "profile": f"{BASE_URL}/profile",
    "eula": f"{BASE_URL}/eula",
    "privacy_policy": f"{BASE_URL}/privacy-policy",
    "data_protection": f"{BASE_URL}/data-protection-policy",
}

# Test Credentials (use environment variables in production)
TEST_USER = {
    "email": os.getenv("TEST_EMAIL", "priya.k@hrrobots.com"),
    "password": os.getenv("TEST_PASSWORD", "Rujula!123")
}

# Timeouts
IMPLICIT_WAIT = 15
EXPLICIT_WAIT = 20
PAGE_LOAD_TIMEOUT = 60

# Browser Settings
HEADLESS = os.getenv("HEADLESS", "true").lower() == "true"
BROWSER = os.getenv("BROWSER", "chrome")

# Test Data
TEST_JD_DATA = {
    "role_name": "Senior Software Engineer",
    "experience": "5",
    "languages": "JavaScript, Python, Java",
    "skills": "AWS, Docker, Kubernetes, Agile"
}

TEST_TEMPLATE_DATA = {
    "name": "Python Fundamentals Test",
    "questions": [
        {
            "text": "What is the output of print(2 ** 3)?",
            "topic": "Python",
            "options": ["8", "6", "9", "3"],
            "correct": "8",
            "level": "fresher"
        },
        {
            "text": "Which keyword is used to define a function?",
            "topic": "Python",
            "options": ["def", "function", "func", "define"],
            "correct": "def",
            "level": "fresher"
        }
    ]
}
