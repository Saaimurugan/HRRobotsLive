import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # Get the email from the event
    email = event.get("email")

    if not email:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Email is required."})
        }
    
    # Normalize email to lowercase for case-insensitive comparison
    email = email.lower().strip()

    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb')

    table_name = 'userDetails'
    table = dynamodb.Table(table_name)

    try:
        # Query the table using the email as the key
        response = table.get_item(Key={"userId": email})

        if 'Item' in response:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "Email is already registered."})
            }
        else:
            return {
                "statusCode": 200,
                "body": json.dumps({"message": "Email is not registered."})
            }

    except ClientError as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": "Could not query DynamoDB.", "details": str(e)})
        }