import boto3
import json
import base64
import hashlib
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)

# Encryption settings (must match other functions)
ITERATIONS = 100000
KEY_LENGTH = 32


def encrypt_password(password):
    """Encrypt password using PBKDF2 with SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
    encrypted = base64.b64encode(salt + key).decode('utf-8')
    return encrypted


def lambda_handler(event, context):
    """
    Set a user's password directly (for admin use only).
    Input: {"email": "user@example.com", "password": "newpassword"}
    """
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))
        email = body["email"]
        password = body["password"]

        # Encrypt the password
        encrypted_password = encrypt_password(password)

        # Update the user's password
        table.update_item(
            Key={'userId': email},
            UpdateExpression='SET #pwd = :pwd',
            ExpressionAttributeNames={'#pwd': 'password'},
            ExpressionAttributeValues={':pwd': encrypted_password}
        )

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f'Password updated for {email}'
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }
