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
        action = body.get("action", "update")  # Default action is update
        
        if action == "get":
            # Get user details
            response = table.get_item(Key={"userId": email})
            
            if 'Item' in response:
                # Remove sensitive fields before returning
                user_data = response['Item']
                user_data.pop('password', None)
                user_data.pop('verificationToken', None)
                
                return {
                    "statusCode": 200,
                    "body": json.dumps(user_data)
                }
            else:
                return {
                    "statusCode": 404,
                    "body": json.dumps({"message": "User not found"})
                }
        
        # Default: update action
        update_expression = "set "
        expression_attribute_values = {}

        for key, value in body.items():
            if key not in ["email", "action", "token"]:
                update_expression += f"{key} = :{key}, "
                expression_attribute_values[f":{key}"] = value

        if not expression_attribute_values:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "No fields to update"})
            }

        update_expression = update_expression.rstrip(", ")

        table.update_item(
            Key={"userId": email},
            UpdateExpression=update_expression,
            ExpressionAttributeValues=expression_attribute_values
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": "User updated successfully"})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
