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
        update_expression = "set "
        expression_attribute_values = {}

        for key, value in body.items():
            if key != "email":
                update_expression += f"{key} = :{key}, "
                expression_attribute_values[f":{key}"] = value

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
