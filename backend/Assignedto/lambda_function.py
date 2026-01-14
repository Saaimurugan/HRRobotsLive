import json
import boto3
from botocore.exceptions import ClientError

def lambda_handler(event, context):
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb')

    # Reference the 'template' table
    table = dynamodb.Table('template')

    try:
        # Parse event to get necessary data
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))

        # Support both old and new parameter names
        template_id = body.get("templateID") or body.get("templateIDSelectedToAssign")
        assigned_email = body.get("assignedEmail") or body.get("email")

        if not template_id or not assigned_email:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "templateID and assignedEmail are required"})
            }

        # Handle REVOKE - clear the assignment
        if assigned_email == "REVOKE":
            response = table.update_item(
                Key={
                    'templateID': template_id
                },
                UpdateExpression="REMOVE AssignedTo",
                ReturnValues="UPDATED_NEW"
            )
            return {
                "statusCode": 200,
                "body": json.dumps({"message": f"Assignment for template {template_id} has been revoked.", "updatedAttributes": response.get('Attributes')})
            }

        # Update the item with the new AssignedTo value
        response = table.update_item(
            Key={
                'templateID': template_id
            },
            UpdateExpression="SET AssignedTo = :email",
            ExpressionAttributeValues={
                ':email': assigned_email
            },
            ReturnValues="UPDATED_NEW"
        )

        return {
            "statusCode": 200,
            "body": json.dumps({"message": f"Template with ID {template_id} updated successfully.", "updatedAttributes": response.get('Attributes')})
        }

    except ClientError as e:
        # Handle any errors from DynamoDB
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
