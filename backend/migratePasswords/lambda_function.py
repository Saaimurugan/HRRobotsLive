import boto3
import json
import base64
import hashlib
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)

# Encryption settings (must match userCreate)
ITERATIONS = 100000
KEY_LENGTH = 32


def encrypt_password(password):
    """Encrypt password using PBKDF2 with SHA256 and random salt."""
    salt = os.urandom(32)
    key = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, ITERATIONS, dklen=KEY_LENGTH)
    encrypted = base64.b64encode(salt + key).decode('utf-8')
    return encrypted


def is_already_encrypted(password):
    """Check if password is already encrypted (base64 encoded with correct length)."""
    try:
        decoded = base64.b64decode(password.encode('utf-8'))
        # Encrypted password should be 64 bytes (32 salt + 32 key)
        return len(decoded) == 64
    except Exception:
        return False


def lambda_handler(event, context):
    try:
        migrated_count = 0
        skipped_count = 0
        failed_users = []

        # Scan all users from the table
        response = table.scan()
        users = response.get('Items', [])

        # Handle pagination if there are more items
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            users.extend(response.get('Items', []))

        for user in users:
            user_id = user.get('userId')
            password = user.get('password', '')

            try:
                # Skip if already encrypted
                if is_already_encrypted(password):
                    skipped_count += 1
                    continue

                # Encrypt the plain text password
                encrypted_password = encrypt_password(password)

                # Update the user's password in DynamoDB
                table.update_item(
                    Key={'userId': user_id},
                    UpdateExpression='SET #pwd = :pwd',
                    ExpressionAttributeNames={'#pwd': 'password'},
                    ExpressionAttributeValues={':pwd': encrypted_password}
                )
                migrated_count += 1

            except Exception as e:
                failed_users.append({'userId': user_id, 'error': str(e)})

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Password migration completed',
                'migrated': migrated_count,
                'skipped': skipped_count,
                'failed': len(failed_users),
                'failedUsers': failed_users
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }
