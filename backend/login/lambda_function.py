import boto3
import json
import base64
import hashlib
import hmac
import datetime
import uuid

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)
auth_table = dynamodb.Table("authTable")

# Secret key for JWT signing (in production, use AWS Secrets Manager)
JWT_SECRET = "HRROBOTSKEYFORJWT"


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
        email = body["email"]
        password = body["password"]

        response = table.get_item(Key={"userId": email})
        user = response.get("Item")

        if not user:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "User not found"})
            }

        if user["password"] == password:
            # Generate JWT token
            now = datetime.datetime.utcnow()
            exp = now + datetime.timedelta(minutes=15)
            token_payload = {
                "email": email,
                "exp": int(exp.timestamp()),
                "iat": int(now.timestamp()),
                "jti": str(uuid.uuid4())
            }
            jwt_token = create_jwt(token_payload, JWT_SECRET)

            # Store token in authTable
            current_time = now.isoformat()
            auth_table.put_item(
                Item={
                    "authId": jwt_token,
                    "createdTime": current_time,
                    "activeFor": 15,
                    "email": email
                }
            )

            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "Credentials are valid",
                    "token": jwt_token
                })
            }
        else:
            return {
                "statusCode": 401,
                "body": json.dumps({"message": "Invalid credentials"})
            }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({str(body) + "message": str(e)})
        }
