import boto3
import json
import datetime

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)


def lambda_handler(event, context):
    """
    Validates user email verification token and enables the user account.
    Expected input: { "email": "user@example.com", "token": "verification_token" }
    """
    try:
        # Parse input
        if isinstance(event, str):
            body = json.loads(event)
        elif isinstance(event, dict):
            if 'body' in event:
                body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
            else:
                body = event
        else:
            body = json.loads(str(event).replace("'", '"'))

        email = body.get("email")
        token = body.get("token")

        if not email or not token:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Email and token are required"})
            }

        # Get user from DynamoDB
        response = table.get_item(Key={"userId": email})
        user = response.get("Item")

        if not user:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "User not found"})
            }

        # Check if already verified
        if user.get("isVerified", False):
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Email already verified"})
            }

        # Verify token
        stored_token = user.get("verificationToken")
        token_expiry = user.get("tokenExpiry")

        if not stored_token or stored_token != token:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Invalid verification token"})
            }

        # Check token expiry (24 hours)
        if token_expiry:
            expiry_time = datetime.datetime.fromisoformat(token_expiry)
            if datetime.datetime.utcnow() > expiry_time:
                return {
                    "statusCode": 400,
                    "body": json.dumps({"message": "Verification token has expired. Please sign up again."})
                }

        # Update user as verified
        table.update_item(
            Key={"userId": email},
            UpdateExpression="SET isVerified = :verified REMOVE verificationToken, tokenExpiry",
            ExpressionAttributeValues={":verified": True}
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "Email verified successfully. You can now log in."})
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"Error: {str(e)}"})
        }
