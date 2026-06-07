import boto3
import json
import base64

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = "userDetails"
table = dynamodb.Table(table_name)

def lambda_handler(event, context):
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'",'"'))
        email = body["email"]
        
        response = table.get_item(Key={"userId": email})
        user = response.get("Item")

        if not user:
            return {
                "statusCode": 404,
                "body": json.dumps({"message": "User not found"})
            }

        # Exclude the password field
        user_without_password = {key: value for key, value in user.items() if key != "password"}

        return {
            "statusCode": 200,
            "body": json.dumps(user_without_password)
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
