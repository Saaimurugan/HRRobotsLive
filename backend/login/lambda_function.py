import boto3
import json
import base64
import hashlib
import hmac
import datetime
import uuid
import os
import sys

# ── reCAPTCHA (recaptcha_utils.py is deployed alongside this file) ────────────
from recaptcha_utils import verify_recaptcha

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)
auth_table = dynamodb.Table("authTable")

# Secret key for JWT signing (in production, use AWS Secrets Manager)
JWT_SECRET = os.environ.get("KEYFORJWT")

# Encryption settings (must match userCreate)
ITERATIONS = 100000
KEY_LENGTH = 32


def is_encrypted(stored_password):
    """Check if password is already encrypted (base64 encoded with correct length)."""
    try:
        decoded = base64.b64decode(stored_password.encode('utf-8'))
        return len(decoded) == 64  # 32 salt + 32 key
    except Exception:
        return False


def verify_password(password, stored_password):
    """Verify password against stored password from DynamoDB (handles both encrypted and plain-text)."""
    try:
        # Check if stored password is encrypted
        if is_encrypted(stored_password):
            # Decode the stored encrypted password
            decoded = base64.b64decode(stored_password.encode('utf-8'))
            # Extract salt (first 32 bytes) and stored key
            salt = decoded[:32]
            stored_key = decoded[32:]
            # Hash the provided password with the same salt
            key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
            # Compare keys using constant-time comparison
            return hmac.compare_digest(key, stored_key)
        else:
            # Legacy: plain-text password comparison
            return password == stored_password
    except Exception:
        return False


def base64url_encode(data):
    """Base64 URL-safe encoding without padding."""
    if isinstance(data, str):
        data = data.encode('utf-8')
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')


def create_jwt(payload, secret):
    """Create a JWT token using built-in libraries."""
    header = {"alg": "HS256", "typ": "JWT"}
    
    header_encoded = base64url_encode(json.dumps(header, separators=(',', ':')))
    payload_encoded = base64url_encode(json.dumps(payload, separators=(',', ':')))
    
    message = f"{header_encoded}.{payload_encoded}"
    signature = hmac.new(
        secret.encode('utf-8'),
        message.encode('utf-8'),
        hashlib.sha256
    ).digest()
    signature_encoded = base64url_encode(signature)
    
    return f"{message}.{signature_encoded}"


def lambda_handler(event, context):
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))

        # ── reCAPTCHA verification ────────────────────────────────────────────
        ok, err = verify_recaptcha(body.get("recaptchaToken", ""), action="login")
        if not ok:
            return err
        # ─────────────────────────────────────────────────────────────────────

        email = body["email"].lower().strip()
        password = body["password"]

        response = table.get_item(Key={"userId": email})
        user = response.get("Item")

        if not user:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "User not found"})
            }

        # Check if user is verified
        if not user.get("isVerified", True):  # Default True for legacy users
            return {
                "statusCode": 403,
                "body": json.dumps({"message": "Please verify your email before logging in. Check your inbox for the verification link."})
            }

        # Verify password
        stored_pwd = user["password"]
        pwd_match = verify_password(password, stored_pwd)
        print(f"DEBUG: email={email}, is_encrypted={is_encrypted(stored_pwd)}, match={pwd_match}, stored_len={len(stored_pwd)}")

        if not pwd_match:
            # If the user is not V2, the password mismatch is expected —
            # the frontend sent a SHA-256 hex that won't match the old stored hash.
            # Tell the frontend to redirect the user through the Forgot Password flow.
            user_version = user.get("userVersion", "V1")
            if user_version != "V2":
                return {
                    "statusCode": 200,
                    "body": json.dumps({
                        "message": "Password reset required",
                        "requiresPasswordChange": True
                    })
                }

            return {
                "statusCode": 401,
                "body": json.dumps({"message": "Invalid credentials"})
            }

        # Password matched — generate JWT token
        now = datetime.datetime.utcnow()
        exp = now + datetime.timedelta(minutes=15)
        token_payload = {
            "email": email,
            "exp": int(exp.timestamp()),
            "iat": int(now.timestamp()),
            "jti": str(uuid.uuid4())
        }
        jwt_token = create_jwt(token_payload, JWT_SECRET)

        auth_table.put_item(
            Item={
                "email": email,
                "authId": jwt_token,
                "createdTime": now.isoformat(),
                "activeFor": 15
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Credentials are valid",
                "token": jwt_token,
                "requiresPasswordChange": False
            })
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
