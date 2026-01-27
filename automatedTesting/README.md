# HR Robots - Selenium Automated Test Suite

Comprehensive Selenium-based test suite for HR Robots application covering all major functionalities.

## Test Coverage

| Module | Test File | Scenarios |
|--------|-----------|-----------|
| Signup | `test_01_signup.py` | User registration, email validation, password strength |
| Login | `test_02_login.py` | Authentication, session management, reCAPTCHA |
| Forgot Password | `test_03_forgot_password.py` | Password reset flow |
| JD Creation | `test_04_jd_creation.py` | Job description generation |
| Candidate Profiling | `test_05_candidate_profiling.py` | Resume-JD matching |
| Screening Test Creation | `test_06_screening_test_creation.py` | Template creation, questions |
| Edit Screening Test | `test_07_edit_screening_test.py` | Template editing, configuration |
| Reports | `test_08_report.py` | Test results viewing |
| Profile | `test_09_profile.py` | Password change, user invitation |
| EULA | `test_10_eula.py` | EULA page functionality |
| JD Template Creation | `test_11_jd_template_creation.py` | JD template creation from templates |
| Performance | `test_12_performance.py` | Performance testing |
| Load Testing | `test_13_load_testing.py` | Load testing scenarios |
| Admin Dashboard | `test_14_admin_dashboard.py` | Admin dashboard, analytics, user management |
| AI Interview | `test_15_ai_interview.py` | AI-powered interview generation, PDF processing |
| Test Setup Wizard | `test_16_test_setup_wizard.py` | System checks, identity verification, permissions |

## Setup

### Prerequisites
- Python 3.8+
- Chrome/Firefox/Edge browser
- pip

### Installation

```bash
cd automatedTesting
pip install -r requirements.txt
```

### Configuration

Create a `.env` file (optional):

```env
BASE_URL=https://www.hrrobots.click
TEST_EMAIL=your_test_email@company.com
TEST_PASSWORD=YourTestPassword123!
BROWSER=chrome
HEADLESS=false
```

## Running Tests

### Run All Tests
```bash
python run_tests.py
```

### Run Specific Test Suite
```bash
python run_tests.py --suite login
python run_tests.py --suite signup
python run_tests.py --suite jd
python run_tests.py --suite screening
python run_tests.py --suite profile
python run_tests.py --suite admin_dashboard
python run_tests.py --suite ai_interview
python run_tests.py --suite test_setup_wizard
```

### Run with Options
```bash
# Headless mode
python run_tests.py --headless

# Different browser
python run_tests.py --browser firefox

# Parallel execution
python run_tests.py --parallel

# Skip HTML report
python run_tests.py --no-report
```

### Run with pytest directly
```bash
# All tests
pytest tests/ -v

# Specific test file
pytest tests/test_02_login.py -v

# Specific test
pytest tests/test_02_login.py::TestLogin::test_login_with_valid_credentials -v

# With HTML report
pytest tests/ -v --html=reports/report.html --self-contained-html
```

## Project Structure

```
automatedTesting/
├── config.py              # Configuration settings
├── conftest.py            # Pytest fixtures
├── requirements.txt       # Python dependencies
├── run_tests.py           # Test runner script
├── README.md              # This file
├── pages/                 # Page Object Models
│   ├── __init__.py
│   ├── base_page.py
│   ├── login_page.py
│   ├── signup_page.py
│   ├── forgot_password_page.py
│   ├── dashboard_page.py
│   ├── create_jd_page.py
│   ├── profiler_page.py
│   ├── create_template_page.py
│   ├── test_page.py
│   ├── result_page.py
│   └── profile_page.py
├── tests/                 # Test files
│   ├── __init__.py
│   ├── test_01_signup.py
│   ├── test_02_login.py
│   ├── test_03_forgot_password.py
│   ├── test_04_jd_creation.py
│   ├── test_05_candidate_profiling.py
│   ├── test_06_screening_test_creation.py
│   ├── test_07_edit_screening_test.py
│   ├── test_08_report.py
│   └── test_09_profile.py
├── utils/                 # Utility functions
│   └── helpers.py
├── test_data/             # Test data files
│   ├── sample_jd.pdf
│   └── sample_resume.pdf
├── reports/               # Generated test reports
└── screenshots/           # Test failure screenshots
```

## Test Data

For candidate profiling tests, add sample PDF files:
- `test_data/sample_jd.pdf` - Sample job description
- `test_data/sample_resume.pdf` - Sample resume

## Notes

1. **Test User**: Update `TEST_EMAIL` and `TEST_PASSWORD` in config.py or .env with valid credentials
2. **reCAPTCHA**: Some tests may be affected by reCAPTCHA after multiple failed attempts
3. **Parallel Execution**: Install `pytest-xdist` for parallel test execution
4. **Screenshots**: Failed tests automatically capture screenshots to `screenshots/` folder

## Troubleshooting

### WebDriver Issues
```bash
# Chrome
pip install webdriver-manager
```

### Permission Issues (Camera/Mic)
Tests use fake media streams. If issues persist, run in non-headless mode.

### Timeout Issues
Increase timeouts in `config.py`:
```python
EXPLICIT_WAIT = 20
PAGE_LOAD_TIMEOUT = 60
```
