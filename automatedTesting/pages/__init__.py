"""
Page Objects for HR Robots Selenium Tests
"""
from pages.base_page import BasePage
from pages.login_page import LoginPage
from pages.signup_page import SignupPage
from pages.forgot_password_page import ForgotPasswordPage
from pages.dashboard_page import DashboardPage
from pages.create_jd_page import CreateJDPage
from pages.profiler_page import ProfilerPage
from pages.create_template_page import CreateTemplatePage
from pages.create_template_from_jd_page import CreateTemplateFromJDPage
from pages.test_page import TestPage
from pages.result_page import ResultPage
from pages.profile_page import ProfilePage
from pages.eula_page import EULAPage

__all__ = [
    "BasePage",
    "LoginPage",
    "SignupPage",
    "ForgotPasswordPage",
    "DashboardPage",
    "CreateJDPage",
    "ProfilerPage",
    "CreateTemplatePage",
    "CreateTemplateFromJDPage",
    "TestPage",
    "ResultPage",
    "ProfilePage",
    "EULAPage"
]
