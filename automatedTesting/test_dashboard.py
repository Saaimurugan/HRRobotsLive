"""
Interactive Test Dashboard - Flask Backend
Real-time test execution with progress updates, pause/resume, and reporting
"""
import os
import sys
import json
import threading
import queue
import time
import subprocess
import base64
from datetime import datetime
from flask import Flask, render_template, jsonify, request, send_file, Response
from flask_cors import CORS

app = Flask(__name__, template_folder='dashboard/templates', static_folder='dashboard/static')
CORS(app)

# Global state
test_state = {
    "status": "idle",  # idle, running, paused, completed, stopped
    "current_test": None,
    "current_suite": None,
    "progress": 0,
    "total_tests": 0,
    "passed": 0,
    "failed": 0,
    "skipped": 0,
    "errors": 0,
    "start_time": None,
    "end_time": None,
    "results": [],  # List of test results with steps
    "current_output": "",
    "pause_requested": False,
    "stop_requested": False,
    "current_screenshot": None,
    "current_url": None,
    "test_steps": {},  # {test_name: [{step, screenshot, timestamp, url}]}
    "suites_results": {},  # {suite_name: [test_results]}
    "_in_failure_section": False,  # Track if parsing FAILURES section
    "_current_failure_test": None,  # Current test being parsed in FAILURES section
    "_last_failed_test": None  # Track last failed test for error capture
}

test_queue = queue.Queue()
output_queue = queue.Queue()
test_thread = None
test_process = None
selenium_driver = None

# Screenshots storage
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), 'test_screenshots')

# Test suites configuration with detailed test descriptions
TEST_SUITES = {
    "signup": {
        "name": "Signup Tests",
        "file": "tests/test_01_signup.py",
        "description": "User registration and validation",
        "tests": {
            "test_signup_page_loads": "Verify signup page loads with all form elements",
            "test_signup_with_valid_business_email": "Register with valid business email address",
            "test_signup_rejects_personal_gmail": "Reject personal Gmail addresses",
            "test_signup_rejects_personal_yahoo": "Reject personal Yahoo addresses",
            "test_signup_rejects_personal_hotmail": "Reject personal Hotmail addresses",
            "test_signup_rejects_personal_outlook": "Reject personal Outlook addresses",
            "test_signup_invalid_email_format": "Reject invalid email format",
            "test_signup_password_too_short": "Reject password less than 8 characters",
            "test_signup_password_no_uppercase": "Reject password without uppercase letter",
            "test_signup_password_no_lowercase": "Reject password without lowercase letter",
            "test_signup_password_no_number": "Reject password without number",
            "test_signup_password_no_special_char": "Reject password without special character",
            "test_signup_password_mismatch": "Reject mismatched password confirmation",
            "test_signup_strong_password_indicator": "Show strong indicator for valid password",
            "test_signup_toggle_password_visibility": "Toggle password visibility works",
            "test_signup_navigate_to_login": "Navigate to login page link works",
            "test_signup_empty_form_submission": "Prevent empty form submission",
            "test_signup_email_already_registered": "Reject already registered email"
        }
    },
    "login": {
        "name": "Login Tests", 
        "file": "tests/test_02_login.py",
        "description": "Authentication and session management",
        "tests": {
            "test_login_page_loads": "Verify login page loads with all elements",
            "test_login_with_valid_credentials": "Login with correct email and password",
            "test_login_with_invalid_email": "Reject invalid email format",
            "test_login_with_wrong_password": "Reject incorrect password",
            "test_login_with_unregistered_email": "Reject unregistered email address",
            "test_login_empty_email": "Prevent login with empty email",
            "test_login_empty_password": "Prevent login with empty password",
            "test_login_empty_form": "Prevent empty form submission",
            "test_login_toggle_password_visibility": "Toggle password visibility works",
            "test_login_navigate_to_signup": "Navigate to signup page link works",
            "test_login_navigate_to_forgot_password": "Navigate to forgot password link works",
            "test_login_failed_attempts_trigger_captcha": "Show captcha after 3 failed attempts",
            "test_login_case_sensitivity_email": "Email should be case insensitive",
            "test_login_whitespace_in_email": "Handle whitespace in email input",
            "test_login_special_characters_in_password": "Handle special characters in password",
            "test_login_button_disabled_during_loading": "Button state during submission",
            "test_login_session_persistence": "Session persists across pages",
            "test_login_redirect_after_success": "Redirect to dashboard after login"
        }
    },
    "forgot_password": {
        "name": "Forgot Password Tests",
        "file": "tests/test_03_forgot_password.py",
        "description": "Password reset flow",
        "tests": {
            "test_forgot_password_page_loads": "Verify forgot password page loads",
            "test_forgot_password_with_valid_email": "Send reset link to valid email",
            "test_forgot_password_displays_email": "Display email in success state",
            "test_forgot_password_try_again_button": "Try again button resets form",
            "test_forgot_password_with_unregistered_email": "Handle unregistered email",
            "test_forgot_password_with_invalid_email_format": "Reject invalid email format",
            "test_forgot_password_empty_email": "Prevent empty email submission",
            "test_forgot_password_back_to_login": "Navigate back to login page",
            "test_forgot_password_from_login_page": "Access from login page link",
            "test_forgot_password_with_personal_email": "Handle personal email addresses",
            "test_forgot_password_multiple_requests": "Allow multiple reset requests",
            "test_forgot_password_email_case_insensitive": "Email case insensitive",
            "test_forgot_password_email_with_whitespace": "Handle whitespace in email"
        }
    },
    "jd_creation": {
        "name": "JD Creation Tests",
        "file": "tests/test_04_jd_creation.py",
        "description": "Job description generation",
        "tests": {
            "test_create_jd_page_loads": "Verify JD creation page loads",
            "test_create_jd_with_all_fields": "Generate JD with all fields filled",
            "test_create_jd_shows_print_button": "Show print button after generation",
            "test_create_jd_generated_content_contains_role": "Generated JD contains role name",
            "test_create_jd_with_project_details": "Generate JD with project details",
            "test_create_jd_empty_role_name": "Handle empty role name",
            "test_create_jd_empty_experience": "Handle empty experience field",
            "test_create_jd_empty_languages": "Handle empty languages field",
            "test_create_jd_empty_skills": "Handle empty skills field",
            "test_create_jd_back_button": "Back button navigation works",
            "test_create_jd_different_experience_levels": "Generate JD for various experience levels",
            "test_create_jd_various_roles": "Generate JD for different roles",
            "test_create_jd_special_characters_in_role": "Handle special characters in role",
            "test_create_jd_long_skills_list": "Handle long skills list",
            "test_create_jd_from_dashboard": "Navigate from dashboard"
        }
    },
    "candidate_profiling": {
        "name": "Candidate Profiling Tests",
        "file": "tests/test_05_candidate_profiling.py",
        "description": "Resume-JD matching",
        "tests": {
            "test_profiler_page_loads": "Verify profiler page loads",
            "test_upload_jd_file": "Upload JD PDF file",
            "test_upload_resume_file": "Upload resume PDF file",
            "test_generate_profile_report": "Generate profile matching report",
            "test_report_shows_suitability_score": "Display suitability score",
            "test_report_shows_print_button": "Show print button for report",
            "test_report_content_sections": "Report contains all sections",
            "test_generate_without_jd": "Handle missing JD file",
            "test_generate_without_resume": "Handle missing resume file",
            "test_generate_without_files": "Handle no files uploaded",
            "test_back_button": "Back button navigation works",
            "test_navigate_from_dashboard": "Navigate from dashboard"
        }
    },
    "screening_test": {
        "name": "Screening Test Creation",
        "file": "tests/test_06_screening_test_creation.py",
        "description": "Template and question management",
        "tests": {
            "test_create_template_page_loads": "Verify template page loads",
            "test_create_template_with_single_question": "Create template with one question",
            "test_create_template_with_multiple_questions": "Create template with multiple questions",
            "test_save_template": "Save template successfully",
            "test_create_template_different_difficulty_levels": "Questions with different difficulties",
            "test_create_template_different_topics": "Questions with different topics",
            "test_delete_question": "Delete question from template",
            "test_edit_question": "Edit existing question",
            "test_generate_questions_ai": "AI question generation",
            "test_group_by_topic_toggle": "Group questions by topic",
            "test_back_button": "Back button navigation",
            "test_navigate_from_dashboard": "Navigate from dashboard",
            "test_create_template_empty_name": "Handle empty template name",
            "test_create_template_empty_question": "Handle empty question text",
            "test_create_template_incomplete_options": "Handle incomplete options",
            "test_create_template_special_characters": "Handle special characters"
        }
    },
    "edit_screening": {
        "name": "Edit Screening Tests",
        "file": "tests/test_07_edit_screening_test.py",
        "description": "Template editing",
        "tests": {
            "test_edit_template_from_dashboard": "Edit template from dashboard",
            "test_edit_template_loads_existing_questions": "Load existing questions",
            "test_add_question_to_existing_template": "Add question to template",
            "test_delete_question_from_existing_template": "Delete question from template",
            "test_save_edited_template": "Save edited template",
            "test_edit_template_back_button": "Back button navigation",
            "test_template_config_button": "Template configuration button",
            "test_template_assign_button": "Template assign button",
            "test_template_delete_button": "Template delete button",
            "test_edit_question_in_template": "Edit question in template",
            "test_change_question_difficulty": "Change question difficulty",
            "test_change_question_topic": "Change question topic",
            "test_open_config_modal": "Open configuration modal",
            "test_set_number_of_questions": "Set number of questions slider",
            "test_set_test_duration": "Set test duration slider",
            "test_set_sensitivity_level": "Set sensitivity level slider",
            "test_set_allowed_defaults": "Set allowed defaults slider",
            "test_save_configuration": "Save configuration changes",
            "test_cancel_configuration": "Cancel configuration changes",
            "test_slider_min_max_values": "Verify slider min/max values"
        }
    },
    "reports": {
        "name": "Report Tests",
        "file": "tests/test_08_report.py",
        "description": "Test results viewing",
        "tests": {
            "test_results_page_loads": "Verify results page loads",
            "test_search_with_valid_test_link": "Search with valid test link",
            "test_search_with_invalid_test_link": "Handle invalid test link",
            "test_search_with_empty_link": "Handle empty search",
            "test_search_with_nonexistent_test": "Handle non-existent test",
            "test_navigate_from_dashboard": "Navigate from dashboard",
            "test_search_multiple_times": "Multiple searches work"
        }
    },
    "profile": {
        "name": "Profile Tests",
        "file": "tests/test_09_profile.py",
        "description": "User profile management",
        "tests": {
            "test_profile_page_loads": "Verify profile page loads",
            "test_change_password_valid": "Change password successfully",
            "test_change_password_mismatch": "Reject mismatched passwords",
            "test_change_password_too_short": "Reject short password",
            "test_change_password_no_uppercase": "Reject password without uppercase",
            "test_change_password_no_lowercase": "Reject password without lowercase",
            "test_change_password_no_number": "Reject password without number",
            "test_change_password_no_special_char": "Reject password without special char",
            "test_change_password_empty": "Handle empty password fields",
            "test_toggle_password_visibility": "Toggle password visibility",
            "test_invite_user_valid_email": "Invite user with valid email",
            "test_invite_user_personal_email": "Handle personal email invitation",
            "test_invite_user_invalid_email": "Reject invalid email format",
            "test_invite_user_empty_email": "Handle empty email",
            "test_invite_existing_user": "Handle existing user invitation",
            "test_back_button": "Back button navigation",
            "test_profile_shows_config_sections": "Show configuration sections",
            "test_multiple_password_changes": "Multiple password changes",
            "test_invite_multiple_users": "Invite multiple users"
        }
    }
}


def reset_state():
    """Reset test state"""
    global test_state
    test_state = {
        "status": "idle",
        "current_test": None,
        "current_suite": None,
        "progress": 0,
        "total_tests": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "errors": 0,
        "start_time": None,
        "end_time": None,
        "results": [],
        "current_output": "",
        "pause_requested": False,
        "stop_requested": False,
        "current_screenshot": None,
        "current_url": None,
        "test_steps": {},
        "suites_results": {},
        "_in_failure_section": False,
        "_current_failure_test": None,
        "_last_failed_test": None
    }
    # Clear screenshots directory
    if os.path.exists(SCREENSHOTS_DIR):
        import shutil
        shutil.rmtree(SCREENSHOTS_DIR, ignore_errors=True)
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    
    # Clear test screenshots JSON file
    test_screenshots_file = os.path.join(os.path.dirname(__file__), 'test_screenshots.json')
    try:
        with open(test_screenshots_file, 'w') as f:
            json.dump({}, f)
    except:
        pass


def parse_pytest_output(line):
    """Parse pytest output line and update state"""
    global test_state
    
    line = line.strip()
    if not line:
        return
    
    test_state["current_output"] += line + "\n"
    
    current_suite = test_state.get("current_suite", "Unknown")
    
    # Initialize suite results if needed
    if current_suite not in test_state["suites_results"]:
        test_state["suites_results"][current_suite] = []
    
    # Parse test results - multiple patterns to catch different pytest output formats
    # Pattern 1: "test_file.py::TestClass::test_name PASSED [ 5%]"
    # Pattern 2: "test_file.py::test_name PASSED"
    # Pattern 3: "PASSED test_file.py::test_name"
    # Pattern 4: "SKIPPED [1] test_file.py::test_name: reason"
    test_result_detected = False
    test_name = None
    status = None
    
    # Track if we're in the failure summary section
    if "FAILURES" in line and "=" in line:
        test_state["_in_failure_section"] = True
        test_state["_current_failure_test"] = None
        return
    
    if "short test summary" in line.lower():
        test_state["_in_failure_section"] = False
        return
    
    # Parse failure details from the FAILURES section
    if test_state.get("_in_failure_section"):
        # Detect test name in failure section (e.g., "_____ TestClass.test_name _____")
        if line.startswith("_") and line.endswith("_") and "test_" in line:
            # Extract test name
            test_name_match = line.strip("_ ").strip()
            if "." in test_name_match:
                test_name_match = test_name_match.split(".")[-1]
            test_state["_current_failure_test"] = test_name_match
            return
        
        # Associate failure details with the current failing test
        current_fail_test = test_state.get("_current_failure_test")
        if current_fail_test and line.strip():
            # Find the test result and add details
            for result in test_state["results"]:
                if result["name"] == current_fail_test and result["status"] in ["failed", "error"]:
                    if len(result["details"]) < 3000:
                        result["details"] += line + "\n"
                    if not result.get("failed_step") and (
                        line.startswith("E ") or 
                        "AssertionError" in line or
                        "assert " in line.lower() or
                        "Error" in line
                    ):
                        result["failed_step"] = line.strip()
                    break
            # Also update in suites_results
            for suite_results in test_state["suites_results"].values():
                for result in suite_results:
                    if result["name"] == current_fail_test and result["status"] in ["failed", "error"]:
                        if len(result["details"]) < 3000:
                            if line not in result["details"]:
                                result["details"] += line + "\n"
                        if not result.get("failed_step") and (
                            line.startswith("E ") or 
                            "AssertionError" in line or
                            "assert " in line.lower() or
                            "Error" in line
                        ):
                            result["failed_step"] = line.strip()
                        break
        return
    
    if "::" in line:
        # Check for status keywords - use word boundaries to avoid false matches
        # Check in specific order: SKIPPED first (can contain other words in reason)
        line_upper = line.upper()
        
        # Look for status at word boundaries (space before or start of relevant section)
        if " PASSED" in line_upper or line_upper.endswith("PASSED") or "PASSED " in line_upper:
            status = "passed"
            test_result_detected = True
        elif " FAILED" in line_upper or line_upper.endswith("FAILED") or "FAILED " in line_upper:
            status = "failed"
            test_result_detected = True
        elif " SKIPPED" in line_upper or line_upper.endswith("SKIPPED") or "SKIPPED " in line_upper or "SKIPPED[" in line_upper.replace(" ", ""):
            status = "skipped"
            test_result_detected = True
        elif " ERROR" in line_upper or line_upper.endswith("ERROR") or "ERROR " in line_upper:
            # Only mark as error if it's a test collection/setup error, not just "Error" in text
            # Check if this looks like a pytest error line
            if "::test_" in line or ":: test_" in line:
                status = "error"
                test_result_detected = True
        
        if test_result_detected:
            try:
                # Extract test name from the line
                parts = line.split("::")
                if len(parts) >= 2:
                    # Get the last part which contains the test name
                    last_part = parts[-1]
                    # Remove status and percentage from the test name
                    test_name = last_part.split()[0] if last_part else parts[-2].split()[0]
                    test_name = test_name.strip()
            except Exception as e:
                test_result_detected = False
    
    if test_result_detected and test_name:
        test_state["current_test"] = test_name
        
        # Get screenshot for this test
        screenshot_data = get_current_screenshot_data()
        
        # Get steps for this test
        steps = test_state["test_steps"].get(test_name, [])
        
        result = {
            "name": test_name,
            "suite": current_suite,
            "status": status,
            "time": datetime.now().isoformat(),
            "details": "",
            "screenshot": screenshot_data.get("screenshot") if screenshot_data else None,
            "url": screenshot_data.get("url") if screenshot_data else None,
            "steps": steps,
            "failed_step": None
        }
        
        # For skipped tests, try to extract the skip reason from the line
        if status == "skipped":
            # Skip reason often appears after the test name, e.g., "SKIPPED [1] path: reason"
            if ":" in line:
                reason_part = line.split(":")[-1].strip()
                if reason_part and len(reason_part) > 2:
                    result["failed_step"] = reason_part
                    result["details"] = reason_part
            elif "reason=" in line.lower():
                reason_idx = line.lower().find("reason=")
                result["failed_step"] = line[reason_idx:].strip()
                result["details"] = line[reason_idx:].strip()
        
        # Track last failed test for capturing subsequent error details
        if status in ["failed", "error"]:
            test_state["_last_failed_test"] = test_name
        
        # Update counters
        if status == "passed":
            test_state["passed"] += 1
        elif status == "failed":
            test_state["failed"] += 1
        elif status == "skipped":
            test_state["skipped"] += 1
        elif status == "error":
            test_state["errors"] += 1
        
        test_state["results"].append(result)
        test_state["suites_results"][current_suite].append(result)
        return  # Important: return after processing test result
    
    # Capture failure/skip details - check multiple conditions
    last_failed = test_state.get("_last_failed_test")
    has_recent_failed = test_state["results"] and test_state["results"][-1]["status"] in ["failed", "error", "skipped"]
    
    if last_failed or has_recent_failed:
        # Capture error lines
        is_error_line = (
            line.startswith("E ") or 
            line.startswith(">") or
            line.startswith("    ") or
            "AssertionError" in line or 
            "assert " in line.lower() or
            "Error" in line or 
            "Exception" in line or
            "Traceback" in line or
            "File \"" in line or
            "SKIP" in line.upper() or 
            "reason" in line.lower() or
            "selenium" in line.lower() or
            "timeout" in line.lower() or
            "element" in line.lower()
        )
        
        if is_error_line:
            # Find the test to update
            target_test = last_failed if last_failed else (test_state["results"][-1]["name"] if test_state["results"] else None)
            
            if target_test:
                # Update in results list
                for result in test_state["results"]:
                    if result["name"] == target_test and result["status"] in ["failed", "error", "skipped"]:
                        if len(result["details"]) < 3000 and line not in result["details"]:
                            result["details"] += line + "\n"
                        if not result.get("failed_step") and (
                            line.startswith("E ") or 
                            "AssertionError" in line or 
                            "Error" in line or
                            "Exception" in line
                        ):
                            result["failed_step"] = line.strip()
                        break
                
                # Update in suites_results
                for suite_results in test_state["suites_results"].values():
                    for result in suite_results:
                        if result["name"] == target_test and result["status"] in ["failed", "error", "skipped"]:
                            if len(result["details"]) < 3000 and line not in result["details"]:
                                result["details"] += line + "\n"
                            if not result.get("failed_step") and (
                                line.startswith("E ") or 
                                "AssertionError" in line or 
                                "Error" in line or
                                "Exception" in line
                            ):
                                result["failed_step"] = line.strip()
                            break
        return
    
    # Parse collected tests count
    if "collected" in line and "item" in line:
        try:
            parts = line.split("collected")
            if len(parts) > 1:
                count_str = parts[1].strip().split()[0]
                count = int(count_str)
                test_state["total_tests"] += count
        except:
            pass


def get_current_screenshot_data():
    """Get current screenshot data from file"""
    screenshot_file = os.path.join(os.path.dirname(__file__), 'current_screenshot.json')
    try:
        if os.path.exists(screenshot_file):
            with open(screenshot_file, 'r') as f:
                return json.load(f)
    except:
        pass
    return None


def save_test_screenshot(test_name, step_name, screenshot_base64, url):
    """Save screenshot for a test step"""
    if not screenshot_base64:
        return None
    
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)
    
    # Create filename
    safe_test_name = "".join(c if c.isalnum() else "_" for c in test_name)
    safe_step_name = "".join(c if c.isalnum() else "_" for c in step_name)
    timestamp = int(time.time() * 1000)
    filename = f"{safe_test_name}_{safe_step_name}_{timestamp}.png"
    filepath = os.path.join(SCREENSHOTS_DIR, filename)
    
    # Save screenshot
    try:
        import base64
        with open(filepath, 'wb') as f:
            f.write(base64.b64decode(screenshot_base64))
        return filename
    except:
        return None


def run_tests_thread(suites):
    """Thread function to run tests"""
    global test_state, test_process
    
    test_state["status"] = "running"
    test_state["start_time"] = datetime.now().isoformat()
    test_state["current_output"] = "Starting tests...\n"
    
    if not suites:
        test_state["current_output"] += "No suites selected!\n"
        test_state["status"] = "completed"
        return
    
    for suite_id in suites:
        if test_state["stop_requested"]:
            break
            
        # Wait while paused
        while test_state["pause_requested"]:
            test_state["status"] = "paused"
            time.sleep(0.5)
            if test_state["stop_requested"]:
                break
        
        if test_state["stop_requested"]:
            break
            
        test_state["status"] = "running"
        
        if suite_id not in TEST_SUITES:
            test_state["current_output"] += f"Unknown suite: {suite_id}\n"
            continue
            
        suite = TEST_SUITES[suite_id]
        test_state["current_suite"] = suite["name"]
        test_state["current_output"] += f"\n{'='*50}\nRunning: {suite['name']}\nFile: {suite['file']}\n{'='*50}\n"
        
        # Run pytest with full traceback for better error details
        cmd = [
            sys.executable, "-m", "pytest",
            suite["file"],
            "-v", "--tb=long",
            "--no-header",
            "-s",
            "--capture=no"
        ]
        
        working_dir = os.path.dirname(os.path.abspath(__file__))
        test_state["current_output"] += f"Command: {' '.join(cmd)}\nWorking dir: {working_dir}\n\n"
        
        try:
            test_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=working_dir
            )
            
            for line in iter(test_process.stdout.readline, ''):
                if test_state["stop_requested"]:
                    test_process.terminate()
                    break
                    
                # Wait while paused
                while test_state["pause_requested"] and not test_state["stop_requested"]:
                    test_state["status"] = "paused"
                    time.sleep(0.5)
                
                if test_state["stop_requested"]:
                    test_process.terminate()
                    break
                    
                test_state["status"] = "running"
                parse_pytest_output(line)
            
            return_code = test_process.wait()
            test_state["current_output"] += f"\nSuite completed with return code: {return_code}\n"
            
        except Exception as e:
            test_state["current_output"] += f"\nError running tests: {str(e)}\n"
            import traceback
            test_state["current_output"] += traceback.format_exc()
    
    test_state["end_time"] = datetime.now().isoformat()
    test_state["status"] = "stopped" if test_state["stop_requested"] else "completed"
    test_state["current_test"] = None
    test_state["current_suite"] = None
    test_process = None


@app.route('/')
def index():
    """Serve the dashboard page"""
    return render_template('index.html')


@app.route('/api/suites')
def get_suites():
    """Get available test suites"""
    return jsonify(TEST_SUITES)


@app.route('/api/status')
def get_status():
    """Get current test status"""
    # Calculate progress from results
    completed = len(test_state["results"])
    total = test_state["total_tests"] if test_state["total_tests"] > 0 else completed
    progress = round((completed / max(total, 1)) * 100) if total > 0 else 0
    
    response = {
        **test_state,
        "progress": progress,
        "completed_count": completed
    }
    return jsonify(response)


@app.route('/api/screenshot')
def get_screenshot():
    """Get current browser screenshot"""
    screenshot_file = os.path.join(os.path.dirname(__file__), 'current_screenshot.json')
    
    try:
        if os.path.exists(screenshot_file):
            with open(screenshot_file, 'r') as f:
                data = json.load(f)
                return jsonify({
                    "screenshot": data.get("screenshot"),
                    "url": data.get("url"),
                    "timestamp": data.get("timestamp")
                })
    except:
        pass
    
    return jsonify({"screenshot": None, "url": None})


@app.route('/api/screenshot/<filename>')
def get_saved_screenshot(filename):
    """Get a saved screenshot by filename"""
    filepath = os.path.join(SCREENSHOTS_DIR, filename)
    if os.path.exists(filepath):
        return send_file(filepath, mimetype='image/png')
    return jsonify({"error": "Screenshot not found"}), 404


@app.route('/api/results/grouped')
def get_grouped_results():
    """Get results grouped by test suite"""
    return jsonify(test_state["suites_results"])


@app.route('/api/test-screenshots/<test_name>')
def get_test_screenshots(test_name):
    """Get screenshots for a specific test"""
    screenshots_file = os.path.join(os.path.dirname(__file__), 'test_screenshots.json')
    try:
        if os.path.exists(screenshots_file):
            with open(screenshots_file, 'r') as f:
                all_screenshots = json.load(f)
                return jsonify(all_screenshots.get(test_name, []))
    except:
        pass
    return jsonify([])


@app.route('/api/all-test-screenshots')
def get_all_test_screenshots():
    """Get all test screenshots"""
    screenshots_file = os.path.join(os.path.dirname(__file__), 'test_screenshots.json')
    try:
        if os.path.exists(screenshots_file):
            with open(screenshots_file, 'r') as f:
                return jsonify(json.load(f))
    except:
        pass
    return jsonify({})


@app.route('/api/test-cases')
def get_test_cases():
    """Get all test cases with descriptions"""
    return jsonify(TEST_SUITES)


@app.route('/api/start', methods=['POST'])
def start_tests():
    """Start test execution"""
    global test_thread
    
    if test_state["status"] == "running":
        return jsonify({"error": "Tests already running"}), 400
    
    data = request.json or {}
    suites = data.get("suites", list(TEST_SUITES.keys()))
    
    reset_state()
    
    test_thread = threading.Thread(target=run_tests_thread, args=(suites,))
    test_thread.daemon = True
    test_thread.start()
    
    return jsonify({"message": "Tests started", "suites": suites})


@app.route('/api/pause', methods=['POST'])
def pause_tests():
    """Pause test execution"""
    if test_state["status"] != "running":
        return jsonify({"error": "Tests not running"}), 400
    
    test_state["pause_requested"] = True
    return jsonify({"message": "Pause requested"})


@app.route('/api/resume', methods=['POST'])
def resume_tests():
    """Resume test execution"""
    if test_state["status"] != "paused":
        return jsonify({"error": "Tests not paused"}), 400
    
    test_state["pause_requested"] = False
    return jsonify({"message": "Tests resumed"})


@app.route('/api/stop', methods=['POST'])
def stop_tests():
    """Stop test execution"""
    global test_process
    
    if test_state["status"] not in ["running", "paused"]:
        return jsonify({"error": "Tests not running"}), 400
    
    test_state["stop_requested"] = True
    test_state["pause_requested"] = False
    
    if test_process:
        try:
            test_process.terminate()
        except:
            pass
    
    return jsonify({"message": "Stop requested"})


@app.route('/api/reset', methods=['POST'])
def reset_tests():
    """Reset test state"""
    global test_process
    
    # If tests are running or paused, stop them first
    if test_state["status"] in ["running", "paused"]:
        test_state["stop_requested"] = True
        test_state["pause_requested"] = False
        
        if test_process:
            try:
                test_process.terminate()
                test_process.wait(timeout=5)
            except:
                pass
        
        # Wait a moment for the thread to finish
        import time
        time.sleep(0.5)
    
    reset_state()
    return jsonify({"message": "State reset"})


@app.route('/api/report')
def get_report():
    """Generate and return test report"""
    report = {
        "title": "HR Robots - Selenium Test Report",
        "generated_at": datetime.now().isoformat(),
        "summary": {
            "total": test_state["total_tests"],
            "passed": test_state["passed"],
            "failed": test_state["failed"],
            "skipped": test_state["skipped"],
            "errors": test_state["errors"],
            "pass_rate": round(test_state["passed"] / max(test_state["progress"], 1) * 100, 2)
        },
        "duration": {
            "start": test_state["start_time"],
            "end": test_state["end_time"]
        },
        "results": test_state["results"],
        "output": test_state["current_output"]
    }
    return jsonify(report)


@app.route('/api/report/html')
def get_html_report():
    """Generate HTML report"""
    report_html = generate_html_report()
    
    # Save to file
    report_path = os.path.join(os.path.dirname(__file__), 'reports', f'report_{int(time.time())}.html')
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_html)
    
    return send_file(report_path, mimetype='text/html', as_attachment=True, 
                     download_name=f'test_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.html')


def generate_html_report():
    """Generate HTML report content"""
    pass_rate = round(test_state["passed"] / max(test_state["progress"], 1) * 100, 2)
    
    results_html = ""
    for result in test_state["results"]:
        status_class = {
            "passed": "success",
            "failed": "danger", 
            "skipped": "warning",
            "error": "danger"
        }.get(result["status"], "secondary")
        
        results_html += f'''
        <tr>
            <td>{result["name"]}</td>
            <td><span class="badge bg-{status_class}">{result["status"].upper()}</span></td>
            <td>{result["time"]}</td>
        </tr>
        '''
    
    return f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HR Robots - Test Report</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {{ background: #f8f9fa; }}
        .report-header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 2rem; }}
        .stat-card {{ border-radius: 10px; padding: 1.5rem; text-align: center; }}
        .stat-card.passed {{ background: #d4edda; color: #155724; }}
        .stat-card.failed {{ background: #f8d7da; color: #721c24; }}
        .stat-card.skipped {{ background: #fff3cd; color: #856404; }}
        .stat-number {{ font-size: 2.5rem; font-weight: bold; }}
    </style>
</head>
<body>
    <div class="report-header">
        <div class="container">
            <h1>🤖 HR Robots - Selenium Test Report</h1>
            <p class="mb-0">Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        </div>
    </div>
    
    <div class="container my-4">
        <div class="row g-3 mb-4">
            <div class="col-md-3">
                <div class="stat-card passed">
                    <div class="stat-number">{test_state["passed"]}</div>
                    <div>Passed</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card failed">
                    <div class="stat-number">{test_state["failed"]}</div>
                    <div>Failed</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card skipped">
                    <div class="stat-number">{test_state["skipped"]}</div>
                    <div>Skipped</div>
                </div>
            </div>
            <div class="col-md-3">
                <div class="stat-card" style="background: #e2e3e5;">
                    <div class="stat-number">{pass_rate}%</div>
                    <div>Pass Rate</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h5 class="mb-0">Test Results</h5>
            </div>
            <div class="card-body">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>Test Name</th>
                            <th>Status</th>
                            <th>Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {results_html}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="card mt-4">
            <div class="card-header">
                <h5 class="mb-0">Console Output</h5>
            </div>
            <div class="card-body">
                <pre style="background: #1e1e1e; color: #d4d4d4; padding: 1rem; border-radius: 5px; max-height: 400px; overflow: auto;">{test_state["current_output"]}</pre>
            </div>
        </div>
    </div>
</body>
</html>
'''


if __name__ == '__main__':
    # Create dashboard directories
    os.makedirs('dashboard/templates', exist_ok=True)
    os.makedirs('dashboard/static', exist_ok=True)
    os.makedirs('reports', exist_ok=True)
    
    print("=" * 50)
    print("HR Robots - Interactive Test Dashboard")
    print("=" * 50)
    print(f"Open http://localhost:5000 in your browser")
    print("=" * 50)
    
    app.run(debug=True, port=5000, threaded=True)
