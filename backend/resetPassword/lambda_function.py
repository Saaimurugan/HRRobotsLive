import boto3
import json
import uuid
import base64
import hashlib
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

table_name = "ForgotPassword"
table = dynamodb.Table(table_name)

user_table_name = "userDetails"
userTable = dynamodb.Table(user_table_name)

# Initialize Lambda client
lambda_client = boto3.client('lambda')

# Encryption settings (must match userCreate)
ITERATIONS = 100000
KEY_LENGTH = 32


def encrypt_password(password):
    """Encrypt password using PBKDF2 with SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
    # Combine salt and key, then base64 encode for storage
    encrypted = base64.b64encode(salt + key).decode('utf-8')
    return encrypted


def getUserEmailUsingForgotPasswordID(forgotPasswordID):
    """Check if the user is registered in the user table."""
    response = table.get_item(Key={"ForgotPasswordID": forgotPasswordID})
    # Extract the 'Item' from the response
    item = response.get("Item")
    if item and "email" in item:
        return item["email"]
    else:
        # Handle case where email is not found
        return None


def lambda_handler(event, context):
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'",'"'))
        password = body["password"]

        # Support two flows:
        # 1. Logged-in password change: { email, password }
        # 2. Forgot-password reset:     { ForgotPasswordID, password }
        email = body.get("email")
        forgotPasswordID = body.get("ForgotPasswordID")

        if not email and not forgotPasswordID:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Either email or ForgotPasswordID is required"})
            }

        if not email:
            email = getUserEmailUsingForgotPasswordID(forgotPasswordID)
            if not email:
                return {
                    "statusCode": 404,
                    "body": json.dumps({"message": "User not found"})
                }

        # Encrypt the new password before storing
        encrypted_password = encrypt_password(password)

        userTable.update_item(
            Key={"userId": email},
            UpdateExpression="SET #password = :password, userVersion = :version",
            ExpressionAttributeValues={
                ":password": encrypted_password,
                ":version": "V2"
            },
            ExpressionAttributeNames={"#password": "password"}
        )

        # If this was a forgot-password flow, delete the used token
        if forgotPasswordID:
            table.delete_item(Key={"ForgotPasswordID": forgotPasswordID})

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Password reset successful!"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
