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
    "suites_results": {}  # {suite_name: [test_results]}
}

test_queue = queue.Queue()
output_queue = queue.Queue()
test_thread = None
test_process = None
selenium_driver = None

# Screenshots storage
SCREENSHOTS_DIR = os.path.join(os.path.dirname(__file__), 'test_screenshots')

# Test suites configuration
TEST_SUITES = {
    "signup": {
        "name": "Signup Tests",
        "file": "tests/test_01_signup.py",
        "description": "User registration and validation"
    },
    "login": {
        "name": "Login Tests", 
        "file": "tests/test_02_login.py",
        "description": "Authentication and session management"
    },
    "forgot_password": {
        "name": "Forgot Password Tests",
        "file": "tests/test_03_forgot_password.py",
        "description": "Password reset flow"
    },
    "jd_creation": {
        "name": "JD Creation Tests",
        "file": "tests/test_04_jd_creation.py",
        "description": "Job description generation"
    },
    "candidate_profiling": {
        "name": "Candidate Profiling Tests",
        "file": "tests/test_05_candidate_profiling.py",
        "description": "Resume-JD matching"
    },
    "screening_test": {
        "name": "Screening Test Creation",
        "file": "tests/test_06_screening_test_creation.py",
        "description": "Template and question management"
    },
    "edit_screening": {
        "name": "Edit Screening Tests",
        "file": "tests/test_07_edit_screening_test.py",
        "description": "Template editing"
    },
    "reports": {
        "name": "Report Tests",
        "file": "tests/test_08_report.py",
        "description": "Test results viewing"
    },
    "profile": {
        "name": "Profile Tests",
        "file": "tests/test_09_profile.py",
        "description": "User profile management"
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
        "suites_results": {}
    }
    # Clear screenshots directory
    if os.path.exists(SCREENSHOTS_DIR):
        import shutil
        shutil.rmtree(SCREENSHOTS_DIR, ignore_errors=True)
    os.makedirs(SCREENSHOTS_DIR, exist_ok=True)


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
    
    # Parse test results - look for percentage pattern like "PASSED [ 5%]" or "FAILED [100%]"
    if "::" in line and ("[" in line and "%" in line):
        try:
            # Extract test name
            parts = line.split("::")
            if len(parts) >= 2:
                test_name = parts[-1].split()[0] if parts[-1] else parts[1].split()[0]
                test_state["current_test"] = test_name
                
                # Get screenshot for this test
                screenshot_data = get_current_screenshot_data()
                
                # Get steps for this test
                steps = test_state["test_steps"].get(test_name, [])
                
                result = {
                    "name": test_name,
                    "suite": current_suite,
                    "status": "unknown",
                    "time": datetime.now().isoformat(),
                    "details": "",
                    "screenshot": screenshot_data.get("screenshot") if screenshot_data else None,
                    "url": screenshot_data.get("url") if screenshot_data else None,
                    "steps": steps,
                    "failed_step": None
                }
                
                if "PASSED" in line:
                    test_state["passed"] += 1
                    result["status"] = "passed"
                elif "FAILED" in line:
                    test_state["failed"] += 1
                    result["status"] = "failed"
                elif "SKIPPED" in line:
                    test_state["skipped"] += 1
                    result["status"] = "skipped"
                elif "ERROR" in line:
                    test_state["errors"] += 1
                    result["status"] = "error"
                
                test_state["results"].append(result)
                test_state["suites_results"][current_suite].append(result)
                
        except Exception as e:
            pass
    
    # Capture failure details and associate with last test
    elif (line.startswith("E ") or line.startswith(">") or 
          "AssertionError" in line or "assert" in line.lower() or
          "Error" in line or "Exception" in line):
        if test_state["results"]:
            test_state["results"][-1]["details"] += line + "\n"
            # Mark the failed step
            if not test_state["results"][-1].get("failed_step"):
                test_state["results"][-1]["failed_step"] = line
    
    # Parse collected tests count
    elif "collected" in line and "item" in line:
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
            continue
            
        suite = TEST_SUITES[suite_id]
        test_state["current_suite"] = suite["name"]
        
        # Run pytest
        cmd = [
            sys.executable, "-m", "pytest",
            suite["file"],
            "-v", "--tb=line",
            "--no-header"
        ]
        
        try:
            test_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                cwd=os.path.dirname(os.path.abspath(__file__))
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
            
            test_process.wait()
            
        except Exception as e:
            test_state["current_output"] += f"\nError: {str(e)}\n"
    
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
    if test_state["status"] == "running":
        return jsonify({"error": "Cannot reset while running"}), 400
    
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
