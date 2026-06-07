import json
import os
import logging
from datetime import datetime
import hashlib
import hmac
import secrets

import boto3
from botocore.exceptions import ClientError

# ---------- Config ----------
TABLE_NAME = os.getenv("USER_TABLE_NAME", "userDetails")
# Iterations and hash parameters for PBKDF2-HMAC
PBKDF2_ITERATIONS = int(os.getenv("PBKDF2_ITERATIONS", "200000"))
HASH_NAME = os.getenv("HASH_NAME", "sha256")
SALT_BYTES = int(os.getenv("SALT_BYTES", "16"))

# ---------- Logging ----------
logger = logging.getLogger()
logger.setLevel(logging.INFO)


def _utc_now_iso() -> str:
    return datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


def _hash_password(password: str, salt: bytes) -> str:
    """Return hex-encoded PBKDF2-HMAC hash."""
    dk = hashlib.pbkdf2_hmac(HASH_NAME, password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return dk.hex()


def _verify_password(password: str, salt_hex: str, stored_hash_hex: str) -> bool:
    salt = bytes.fromhex(salt_hex)
    computed = _hash_password(password, salt)
    # constant-time compare
    return hmac.compare_digest(computed, stored_hash_hex)


# Initialize DynamoDB client outside the handler (connection reuse)
dynamodb = boto3.resource("dynamodb")
table = dynamodb.Table(TABLE_NAME)


def create_initial_admin(admin_email: str, admin_password: str, admin_name: str):
    """
    Create the first admin user or promote existing user to admin.
    Stores password securely (salt + PBKDF2-HMAC hash).
    """
    try:
        logger.info("Creating initial admin user | email=%s", admin_email)

        # Check if user already exists
        resp = table.get_item(Key={"userId": admin_email})
        existing_user = resp.get("Item")

        if existing_user:
            # If already admin, return success
            if existing_user.get("role") == "admin":
                logger.info("User already admin | email=%s", admin_email)
                return {
                    "success": True,
                    "message": "User already exists as admin",
                    "user": admin_email,
                }

            # Otherwise, promote to admin
            logger.info("Promoting existing user to admin | email=%s", admin_email)
            table.update_item(
                Key={"userId": admin_email},
                UpdateExpression="SET #role = :role",
                ExpressionAttributeNames={"#role": "role"},
                ExpressionAttributeValues={":role": "admin"},
            )
            return {
                "success": True,
                "message": "Existing user promoted to admin",
                "user": admin_email,
            }

        # Create new admin user
        now = _utc_now_iso()
        salt = secrets.token_bytes(SALT_BYTES)
        password_hash = _hash_password(admin_password, salt)

        admin_user = {
            "userId": admin_email,
            # Store hashed password + salt
            "passwordHash": password_hash,
            "passwordSalt": salt.hex(),
            # Keep this for backward compatibility if you have readers expecting 'password' (optional):
            # "password": None,
            "name": admin_name,
            "role": "admin",
            "createdAt": now,
            "lastLogin": now,
            "isActive": True,
        }

        table.put_item(Item=admin_user, ConditionExpression="attribute_not_exists(userId)")
        logger.info("Created new admin user | email=%s", admin_email)

        return {
            "success": True,
            "message": "Admin user created successfully",
            "user": admin_email,
        }

    except ClientError as e:
        # ConditionalCheckFailedException if user was created between get and put
        logger.error("DynamoDB client error: %s", e, exc_info=True)
        return {
            "success": False,
            "message": f"DynamoDB error: {e.response.get('Error', {}).get('Message', str(e))}",
            "user": admin_email,
        }
    except Exception as e:
        logger.error("Error creating admin user: %s", e, exc_info=True)
        return {"success": False, "message": f"Error: {str(e)}", "user": admin_email}


def verify_admin_authentication(admin_email: str, admin_password: str) -> bool:
    """
    Verify that the admin user can be authenticated and has the right shape.
    """
    try:
        logger.info("Verifying admin authentication | email=%s", admin_email)
        resp = table.get_item(Key={"userId": admin_email})
        user = resp.get("Item")

        if not user:
            logger.info("User not found | email=%s", admin_email)
            return False

        # Password check (hashed)
        salt_hex = user.get("passwordSalt")
        hash_hex = user.get("passwordHash")

        if not salt_hex or not hash_hex:
            # Fallback for legacy records that may still have plaintext "password"
            legacy_password = user.get("password")
            if legacy_password is None or legacy_password != admin_password:
                logger.info("Password verification failed (no hash or mismatch) | email=%s", admin_email)
                return False
        else:
            if not _verify_password(admin_password, salt_hex, hash_hex):
                logger.info("Password verification failed | email=%s", admin_email)
                return False

        # Role check
        if user.get("role") != "admin":
            logger.info("User is not admin | email=%s role=%s", admin_email, user.get("role"))
            return False

        # Required fields
        required = ["userId", "name", "role", "createdAt", "lastLogin", "isActive"]
        missing = [f for f in required if f not in user]
        if missing:
            logger.info("Missing required fields | email=%s missing=%s", admin_email, ",".join(missing))
            return False

        return True

    except Exception as e:
        logger.error("Authentication verification error: %s", e, exc_info=True)
        return False


def _response(status_code: int, body_obj: dict):
    """API Gateway compatible response."""
    return {
        "statusCode": status_code,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(body_obj),
    }


def lambda_handler(event, context):
    """
    Lambda handler for creating initial admin user.

    Expected event (JSON body for API Gateway HTTP API / REST API):
    {
        "email": "admin@example.com",
        "password": "securePassword123",
        "name": "Admin User"   // optional, defaults to "System Administrator"
    }
    """
    try:
        # If coming from API Gateway with string body
        if isinstance(event, dict) and "body" in event:
            # HTTP API can pass already-parsed JSON; guard both cases
            raw_body = event["body"]
            if isinstance(raw_body, str):
                payload = json.loads(raw_body or "{}")
            else:
                payload = raw_body or {}
        else:
            # Direct invocation (test event or SDK)
            payload = json.loads(event) if isinstance(event, str) else (event or {})

        admin_email = (payload.get("email") or "").strip().lower()
        admin_password = payload.get("password") or ""
        admin_name = payload.get("name") or "System Administrator"

        if not admin_email or not admin_password:
            return _response(
                400,
                {"message": "Email and password are required", "success": False},
            )

        if len(admin_password) < 8:
            return _response(
                400,
                {"message": "Password must be at least 8 characters long", "success": False},
            )

        result = create_initial_admin(admin_email, admin_password, admin_name)
        if not result.get("success"):
            return _response(500, result)

        auth_verified = verify_admin_authentication(admin_email, admin_password)

        return _response(
            200,
            {
                "message": result["message"],
                "success": True,
                "user": result["user"],
                "authentication_verified": auth_verified,
            },
        )

    except Exception as e:
        logger.error("Unhandled error in handler: %s", e, exc_info=True)
        return _response(500, {"message": f"Error creating admin user: {str(e)}", "success": False})
