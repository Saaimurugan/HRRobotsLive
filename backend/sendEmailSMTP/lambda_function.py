import smtplib
import json
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def lambda_handler(event, context):
    # Extract data from the event
    recipient_email = event.get("recipient_email")
    subject = event.get("subject", "Default Subject")
    body = event.get("body", "This is the default email body.")

    # GoDaddy email SMTP credentials
    smtp_server = "smtpout.secureserver.net"
    smtp_port = 587
    smtp_username = "bot@hrrobots.com"
    #smtp_password = "#pSaM13rG!"
    smtp_password = "EB[fjhW&^VCL4b!;R@`9:a"

    # Email details
    sender_email = "bot@hrrobots.com"

    # Create the email
    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = recipient_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "html"))

    # Send the email
    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()  
            server.login(smtp_username, smtp_password)
            server.sendmail(sender_email, recipient_email, msg.as_string())
        return {"statusCode": 200, "body": "Email sent successfully"}
    except Exception as e:
        return {"statusCode": 500, "body": str(e)}
