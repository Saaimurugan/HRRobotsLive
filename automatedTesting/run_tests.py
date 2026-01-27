"""
Test Runner Script for HR Robots Selenium Tests
"""
import subprocess
import sys
import os
import argparse
from datetime import datetime


def run_tests(test_suite=None, browser="chrome", headless=False, parallel=False, report=True):
    """
    Run Selenium tests with specified options
    
    Args:
        test_suite: Specific test suite to run (e.g., 'signup', 'login', 'all')
        browser: Browser to use (chrome, firefox, edge)
        headless: Run in headless mode
        parallel: Run tests in parallel
        report: Generate HTML report
    """
    # Set environment variables
    os.environ["BROWSER"] = browser
    os.environ["HEADLESS"] = "true" if headless else "false"
    
    # Build pytest command
    cmd = ["python", "-m", "pytest"]
    
    # Add test path
    if test_suite and test_suite != "all":
        test_file_map = {
            "signup": "tests/test_01_signup.py",
            "login": "tests/test_02_login.py",
            "forgot_password": "tests/test_03_forgot_password.py",
            "jd": "tests/test_04_jd_creation.py",
            "profiling": "tests/test_05_candidate_profiling.py",
            "screening": "tests/test_06_screening_test_creation.py",
            "edit_test": "tests/test_07_edit_screening_test.py",
            "report": "tests/test_08_report.py",
            "profile": "tests/test_09_profile.py",
            "eula": "tests/test_10_eula.py",
            "jd_template": "tests/test_11_jd_template_creation.py",
            "performance": "tests/test_12_performance.py",
            "load_testing": "tests/test_13_load_testing.py",
            "admin_dashboard": "tests/test_14_admin_dashboard.py",
            "ai_interview": "tests/test_15_ai_interview.py",
            "test_setup_wizard": "tests/test_16_test_setup_wizard.py",
        }
        
        if test_suite in test_file_map:
            cmd.append(test_file_map[test_suite])
        else:
            print(f"Unknown test suite: {test_suite}")
            print(f"Available suites: {', '.join(test_file_map.keys())}, all")
            return 1
    else:
        cmd.append("tests/")
    
    # Add options
    cmd.extend(["-v", "--tb=short"])
    
    # Parallel execution
    if parallel:
        cmd.extend(["-n", "auto"])
    
    # HTML report
    if report:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = f"reports/test_report_{timestamp}.html"
        os.makedirs("reports", exist_ok=True)
        cmd.extend(["--html", report_path, "--self-contained-html"])
    
    # Run tests
    print(f"Running command: {' '.join(cmd)}")
    print(f"Browser: {browser}")
    print(f"Headless: {headless}")
    print("-" * 50)
    
    result = subprocess.run(cmd, cwd=os.path.dirname(os.path.abspath(__file__)))
    
    return result.returncode


def main():
    parser = argparse.ArgumentParser(description="Run HR Robots Selenium Tests")
    
    parser.add_argument(
        "--suite", "-s",
        choices=["signup", "login", "forgot_password", "jd", "profiling", 
                 "screening", "edit_test", "report", "profile", "eula",
                 "jd_template", "performance", "load_testing", "admin_dashboard",
                 "ai_interview", "test_setup_wizard", "all"],
        default="all",
        help="Test suite to run"
    )
    
    parser.add_argument(
        "--browser", "-b",
        choices=["chrome", "firefox", "edge"],
        default="chrome",
        help="Browser to use"
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run in headless mode"
    )
    
    parser.add_argument(
        "--parallel", "-p",
        action="store_true",
        help="Run tests in parallel"
    )
    
    parser.add_argument(
        "--no-report",
        action="store_true",
        help="Skip HTML report generation"
    )
    
    args = parser.parse_args()
    
    return run_tests(
        test_suite=args.suite,
        browser=args.browser,
        headless=args.headless,
        parallel=args.parallel,
        report=not args.no_report
    )


if __name__ == "__main__":
    sys.exit(main())
