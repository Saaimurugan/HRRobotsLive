import boto3
import json
import base64
import hashlib
import os
import uuid
import datetime
import urllib.request

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)

# Encryption settings
ITERATIONS = 100000
KEY_LENGTH = 32

# Email API endpoint
SEND_EMAIL_API = "https://jn1y00ejmj.execute-api.us-east-1.amazonaws.com/dev/sendEmailSMTP"

# Frontend URL for verification
FRONTEND_URL = "https://www.hrrobots.click"


def encrypt_password(password):
    """Encrypt password using PBKDF2 with SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
    # Combine salt and key, then base64 encode for storage
    encrypted = base64.b64encode(salt + key).decode('utf-8')
    return encrypted


def generate_verification_token():
    """Generate a unique verification token."""
    return str(uuid.uuid4())


def send_verification_email(email, token):
    """Send verification email using the sendEmailSMTP API."""
    verification_link = f"{FRONTEND_URL}/verify-email?email={email}&token={token}"
    
    email_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1cbbb4;">Verify Your Email Address</h2>
        <p>Hello,</p>
        <p>Thank you for signing up for HR Robots! Please verify your email address to activate your account.</p>
        <p style="margin-top: 20px;">
            <a href="{verification_link}" 
               style="background: linear-gradient(135deg, #1cbbb4 0%, #0d9488 100%); 
                      color: white; 
                      padding: 12px 24px; 
                      text-decoration: none; 
                      border-radius: 6px; 
                      display: inline-block;">
                Verify Email
            </a>
        </p>
        <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Or copy and paste this link in your browser:<br/>
            <a href="{verification_link}" style="color: #1cbbb4;">{verification_link}</a>
        </p>
        <p style="margin-top: 20px; color: #999; font-size: 12px;">
            This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
    </div>
    """
    
    payload = {
        "recipient_email": email,
        "subject": "Verify your HR Robots account",
        "body": email_body
    }
    
    try:
        req = urllib.request.Request(
            SEND_EMAIL_API,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status == 200
    except Exception as e:
        print(f"Failed to send verification email: {str(e)}")
        return False


def lambda_handler(event, context):
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'",'"'))
        email = body["email"]
        password = body["password"]

        # Encrypt password before storing
        encrypted_password = encrypt_password(password)
        
        # Generate verification token
        verification_token = generate_verification_token()
        
        # Token expires in 24 hours
        token_expiry = (datetime.datetime.utcnow() + datetime.timedelta(hours=24)).isoformat()

        table.put_item(
            Item={
                "userId": email,
                "password": encrypted_password,
                "isVerified": False,
                "verificationToken": verification_token,
                "tokenExpiry": token_expiry,
                "createdAt": datetime.datetime.utcnow().isoformat()
            }
        )
        
        # Send verification email
        email_sent = send_verification_email(email, verification_token)

        if email_sent:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Account created! Please check your email to verify your account.",
                    "requiresVerification": True
                })
            }
        else:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Account created but verification email failed to send. Please contact support.",
                    "requiresVerification": True
                })
            }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }