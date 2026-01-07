"""
Script to create sample PDF test files for Candidate Profiling tests
Requires: pip install reportlab
"""
import os

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch
except ImportError:
    print("Installing reportlab...")
    import subprocess
    subprocess.check_call(['pip', 'install', 'reportlab'])
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    from reportlab.lib.units import inch


def create_sample_jd():
    """Create a sample Job Description PDF"""
    filename = os.path.join(os.path.dirname(__file__), "sample_jd.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Title
    c.setFont("Helvetica-Bold", 18)
    c.drawString(1*inch, height - 1*inch, "Job Description")
    
    # Position
    c.setFont("Helvetica-Bold", 14)
    c.drawString(1*inch, height - 1.5*inch, "Senior Software Engineer - Full Stack")
    
    # Content
    c.setFont("Helvetica", 11)
    y = height - 2*inch
    
    content = [
        "Company: Tech Solutions Inc.",
        "Location: Remote / Hybrid",
        "Experience: 5+ years",
        "",
        "About the Role:",
        "We are looking for a Senior Software Engineer to join our growing team.",
        "You will be responsible for designing and developing scalable web applications.",
        "",
        "Requirements:",
        "- 5+ years of experience in software development",
        "- Strong proficiency in Python and JavaScript",
        "- Experience with React.js and Node.js",
        "- Knowledge of SQL and NoSQL databases (PostgreSQL, MongoDB)",
        "- Experience with AWS services (EC2, S3, Lambda, RDS)",
        "- Familiarity with Docker and Kubernetes",
        "- Understanding of CI/CD pipelines",
        "- Excellent problem-solving skills",
        "- Strong communication skills",
        "",
        "Nice to Have:",
        "- Experience with microservices architecture",
        "- Knowledge of GraphQL",
        "- Experience with Agile/Scrum methodologies",
        "",
        "Responsibilities:",
        "- Design and develop scalable web applications",
        "- Write clean, maintainable, and well-documented code",
        "- Collaborate with cross-functional teams",
        "- Participate in code reviews and mentor junior developers",
        "- Troubleshoot and debug applications",
        "- Contribute to architectural decisions",
    ]
    
    for line in content:
        c.drawString(1*inch, y, line)
        y -= 0.25*inch
        if y < 1*inch:
            c.showPage()
            y = height - 1*inch
            c.setFont("Helvetica", 11)
    
    c.save()
    print(f"Created: {filename}")
    return filename


def create_sample_resume():
    """Create a sample Resume PDF"""
    filename = os.path.join(os.path.dirname(__file__), "sample_resume.pdf")
    c = canvas.Canvas(filename, pagesize=letter)
    width, height = letter
    
    # Name
    c.setFont("Helvetica-Bold", 18)
    c.drawString(1*inch, height - 1*inch, "John Smith")
    
    # Contact
    c.setFont("Helvetica", 10)
    c.drawString(1*inch, height - 1.3*inch, "john.smith@email.com | (555) 123-4567 | LinkedIn: linkedin.com/in/johnsmith")
    
    # Content
    c.setFont("Helvetica", 11)
    y = height - 1.8*inch
    
    content = [
        "PROFESSIONAL SUMMARY",
        "─" * 60,
        "Senior Software Engineer with 6+ years of experience in full-stack development.",
        "Expertise in Python, JavaScript, React, and cloud technologies.",
        "",
        "SKILLS",
        "─" * 60,
        "Languages: Python, JavaScript, TypeScript, Java, SQL",
        "Frontend: React.js, Vue.js, HTML5, CSS3, Redux",
        "Backend: Node.js, Django, Flask, Express.js",
        "Databases: PostgreSQL, MongoDB, Redis, MySQL",
        "Cloud: AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes",
        "Tools: Git, Jenkins, JIRA, Agile/Scrum",
        "",
        "EXPERIENCE",
        "─" * 60,
        "Senior Software Engineer | ABC Tech Corp | 2020 - Present",
        "- Led development of microservices architecture serving 1M+ users",
        "- Implemented CI/CD pipelines reducing deployment time by 60%",
        "- Mentored team of 5 junior developers",
        "",
        "Software Engineer | XYZ Solutions | 2018 - 2020",
        "- Developed RESTful APIs using Python and Flask",
        "- Built responsive web applications with React.js",
        "- Optimized database queries improving performance by 40%",
        "",
        "EDUCATION",
        "─" * 60,
        "Bachelor of Science in Computer Science",
        "State University | 2014 - 2018",
        "",
        "CERTIFICATIONS",
        "─" * 60,
        "- AWS Certified Solutions Architect",
        "- Certified Kubernetes Administrator (CKA)",
    ]
    
    for line in content:
        if line.startswith("─"):
            c.setFont("Helvetica", 8)
        elif line in ["PROFESSIONAL SUMMARY", "SKILLS", "EXPERIENCE", "EDUCATION", "CERTIFICATIONS"]:
            c.setFont("Helvetica-Bold", 12)
        else:
            c.setFont("Helvetica", 11)
        
        c.drawString(1*inch, y, line)
        y -= 0.22*inch
        if y < 1*inch:
            c.showPage()
            y = height - 1*inch
    
    c.save()
    print(f"Created: {filename}")
    return filename


if __name__ == "__main__":
    print("Creating sample test PDF files...")
    create_sample_jd()
    create_sample_resume()
    print("\nDone! Test files created in test_data folder.")
