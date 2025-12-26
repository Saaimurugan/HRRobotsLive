import boto3
import json
import base64
import hashlib
import hmac

# Encryption settings (must match other functions)
ITERATIONS = 100000
KEY_LENGTH = 32


def lambda_handler(event, context):
    """
    Debug password verification.
    Input: {"password": "plaintext", "encrypted": "base64string"}
    Returns whether they match and debug info.
    """
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))
        password = body["password"]
        encrypted = body["encrypted"]

        # Decode the encrypted password
        try:
            decoded = base64.b64decode(encrypted.encode('utf-8'))
            decoded_length = len(decoded)
        except Exception as e:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Invalid base64',
                    'details': str(e)
                })
            }

        # Check if it's properly formatted (64 bytes = 32 salt + 32 key)
        is_valid_format = decoded_length == 64

        if not is_valid_format:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'match': False,
                    'valid_format': False,
                    'decoded_length': decoded_length,
                    'expected_length': 64,
                    'message': 'Encrypted password has wrong length. May be plain text or double-encrypted.'
                })
            }

        # Extract salt and stored key
        salt = decoded[:32]
        stored_key = decoded[32:]

        # Hash the provided password with the extracted salt
        computed_key = hashlib.pbkdf2_hmac(
            'sha256',
            password.encode('utf-8'),
            salt,
            ITERATIONS,
            dklen=KEY_LENGTH
        )

        # Compare
        match = hmac.compare_digest(computed_key, stored_key)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'match': match,
                'valid_format': True,
                'decoded_length': decoded_length,
                'salt_hex': salt.hex(),
                'stored_key_hex': stored_key.hex(),
                'computed_key_hex': computed_key.hex()
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': str(e)})
        }
