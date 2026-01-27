"""
Script to create test data files for the automated test suite
"""
import os
import subprocess
import sys

def create_test_data_directory():
    """Create test_data directory if it doesn't exist"""
    os.makedirs("test_data", exist_ok=True)
    print("✓ Created test_data directory")

def create_sample_pdfs():
    """Create sample PDF files for AI interview tests"""
    try:
        # Try to run the PDF creation script
        result = subprocess.run([sys.executable, "test_data/create_sample_pdfs.py"], 
                              cwd=".", capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Created sample PDF files")
        else:
            print("⚠ Could not create PDF files - reportlab may not be installed")
            print("  Run: pip install reportlab")
            create_placeholder_files()
    except Exception as e:
        print(f"⚠ Error creating PDF files: {e}")
        create_placeholder_files()

def create_placeholder_files():
    """Create placeholder text files if PDF creation fails"""
    jd_content = """
Sample Job Description

Position: Senior Software Engineer
Company: HR Robots Inc.
Experience Required: 5+ years

Key Responsibilities:
• Develop and maintain web applications
• Work with React, Node.js, and Python
• Collaborate with cross-functional teams
• Write clean, maintainable code

Required Skills:
• JavaScript, Python, Java
• React, Angular, or Vue.js
• Node.js, Express.js
• SQL and NoSQL databases
• AWS, Docker, Kubernetes
"""

    resume_content = """
John Doe - Software Engineer

Email: john.doe@email.com
Phone: (555) 123-4567

PROFESSIONAL SUMMARY
Experienced Software Engineer with 6+ years of experience
in full-stack web development using modern technologies.

TECHNICAL SKILLS
• Programming Languages: JavaScript, Python, Java, TypeScript
• Frontend: React, Angular, HTML5, CSS3
• Backend: Node.js, Express.js, Django, Spring Boot
• Databases: MySQL, PostgreSQL, MongoDB
• Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes

WORK EXPERIENCE
Senior Software Engineer | Tech Corp | 2020-Present
• Developed scalable web applications using React and Node.js
• Implemented microservices architecture with Docker
• Led a team of 4 developers on multiple projects

EDUCATION
Bachelor of Science in Computer Science
University of Technology | 2018
"""

    with open("test_data/sample_jd.txt", "w") as f:
        f.write(jd_content)
    
    with open("test_data/sample_resume.txt", "w") as f:
        f.write(resume_content)
    
    print("✓ Created placeholder text files")

def main():
    """Main function to create all test data"""
    print("Creating test data for HR Robots automated test suite...")
    print("=" * 50)
    
    create_test_data_directory()
    create_sample_pdfs()
    
    print("=" * 50)
    print("Test data creation complete!")
    print("\nNext steps:")
    print("1. Install dependencies: pip install -r requirements.txt")
    print("2. Copy .env.example to .env and update with your credentials")
    print("3. Run tests: python run_tests.py")

if __name__ == "__main__":
    main()