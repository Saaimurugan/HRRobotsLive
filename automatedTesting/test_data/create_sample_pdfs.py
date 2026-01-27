"""
Script to create sample PDF files for testing AI Interview functionality
"""
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
import os

def create_sample_jd_pdf():
    """Create a sample job description PDF"""
    filename = "sample_jd.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "Job Description")
    
    # Content
    c.setFont("Helvetica", 12)
    y_position = 720
    
    jd_content = [
        "Position: Senior Software Engineer",
        "",
        "Company: HR Robots Inc.",
        "",
        "Experience Required: 5+ years",
        "",
        "Key Responsibilities:",
        "• Develop and maintain web applications",
        "• Work with React, Node.js, and Python",
        "• Collaborate with cross-functional teams",
        "• Write clean, maintainable code",
        "• Participate in code reviews",
        "",
        "Required Skills:",
        "• JavaScript, Python, Java",
        "• React, Angular, or Vue.js",
        "• Node.js, Express.js",
        "• SQL and NoSQL databases",
        "• AWS, Docker, Kubernetes",
        "• Git version control",
        "",
        "Preferred Qualifications:",
        "• Bachelor's degree in Computer Science",
        "• Experience with Agile methodologies",
        "• Strong problem-solving skills",
        "• Excellent communication skills",
    ]
    
    for line in jd_content:
        c.drawString(100, y_position, line)
        y_position -= 20
    
    c.save()
    print(f"Created {filename}")

def create_sample_resume_pdf():
    """Create a sample resume PDF"""
    filename = "sample_resume.pdf"
    c = canvas.Canvas(filename, pagesize=letter)
    
    # Title
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 750, "John Doe - Software Engineer")
    
    # Content
    c.setFont("Helvetica", 12)
    y_position = 720
    
    resume_content = [
        "Email: john.doe@email.com",
        "Phone: (555) 123-4567",
        "",
        "PROFESSIONAL SUMMARY",
        "Experienced Software Engineer with 6+ years of experience",
        "in full-stack web development using modern technologies.",
        "",
        "TECHNICAL SKILLS",
        "• Programming Languages: JavaScript, Python, Java, TypeScript",
        "• Frontend: React, Angular, HTML5, CSS3",
        "• Backend: Node.js, Express.js, Django, Spring Boot",
        "• Databases: MySQL, PostgreSQL, MongoDB",
        "• Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes",
        "• Tools: Git, Jenkins, JIRA, VS Code",
        "",
        "WORK EXPERIENCE",
        "",
        "Senior Software Engineer | Tech Corp | 2020-Present",
        "• Developed scalable web applications using React and Node.js",
        "• Implemented microservices architecture with Docker",
        "• Led a team of 4 developers on multiple projects",
        "• Improved application performance by 40%",
        "",
        "Software Engineer | StartupXYZ | 2018-2020",
        "• Built RESTful APIs using Python and Django",
        "• Worked with AWS services for deployment",
        "• Collaborated with UI/UX designers",
        "",
        "EDUCATION",
        "Bachelor of Science in Computer Science",
        "University of Technology | 2018",
    ]
    
    for line in resume_content:
        c.drawString(100, y_position, line)
        y_position -= 20
        
        # Start new page if needed
        if y_position < 100:
            c.showPage()
            c.setFont("Helvetica", 12)
            y_position = 750
    
    c.save()
    print(f"Created {filename}")

if __name__ == "__main__":
    # Create test_data directory if it doesn't exist
    os.makedirs(".", exist_ok=True)
    
    try:
        create_sample_jd_pdf()
        create_sample_resume_pdf()
        print("Sample PDF files created successfully!")
    except ImportError:
        print("reportlab not installed. Install with: pip install reportlab")
        print("Creating placeholder text files instead...")
        
        # Create placeholder text files
        with open("sample_jd.txt", "w") as f:
            f.write("Sample Job Description - Install reportlab to create PDF version")
        
        with open("sample_resume.txt", "w") as f:
            f.write("Sample Resume - Install reportlab to create PDF version")
        
        print("Placeholder text files created.")