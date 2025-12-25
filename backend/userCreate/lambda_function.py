import boto3
import json
import base64
import hashlib
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)

# Encryption settings
ITERATIONS = 100000
KEY_LENGTH = 32


def encrypt_password(password):
    """Encrypt password using PBKDF2 with SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
    # Combine salt and key, then base64 encode for storage
    encrypted = base64.b64encode(salt + key).decode('utf-8')
    return encrypted


def lambda_handler(event, context):
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'",'"'))
        email = body["email"]
        password = body["password"]

        # Encrypt password before storing
        encrypted_password = encrypt_password(password)

        table.put_item(
            Item={
                "userId": email,
                "password": encrypted_password,
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "User created successfully"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }