import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime

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
        assigned_role = body.get("assignedRole", "recruiter")  # Default to recruiter for backward compatibility
        action = body.get("action", "assign")  # "assign" or "approve"
        actor_email = body.get("actorEmail", "")  # Who is performing the action
        actor_name = body.get("actorName", "")  # Name of the person performing the action

        current_time = datetime.utcnow().isoformat() + "Z"

        if not template_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "templateID is required"})
            }

        # Handle APPROVE action
        if action == "approve":
            # Get current template to retrieve history
            get_response = table.get_item(Key={'templateID': template_id})
            current_item = get_response.get('Item', {})
            history = current_item.get('AssignmentHistory', [])
            
            # Add approval to history
            history.append({
                "action": "approved",
                "by": actor_email,
                "byName": actor_name,
                "date": current_time,
                "role": assigned_role
            })
            
            # After approval, clear AssignedTo so it no longer shows in reviewer's list
            # The template will only show to the original owner
            response = table.update_item(
                Key={
                    'templateID': template_id
                },
                UpdateExpression="SET ApprovedBy = :approver, ApprovedByName = :approverName, ApprovedDate = :date, ApprovalStatus = :status, AssignmentHistory = :history REMOVE AssignedTo, AssignedRole",
                ExpressionAttributeValues={
                    ':approver': actor_email,
                    ':approverName': actor_name,
                    ':date': current_time,
                    ':status': 'approved',
                    ':history': history
                },
                ReturnValues="UPDATED_NEW"
            )
            
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": f"Template {template_id} has been approved by {actor_name}.",
                    "updatedAttributes": response.get('Attributes'),
                    "approvedBy": actor_email,
                    "approvedByName": actor_name,
                    "approvedDate": current_time
                })
            }

        # Handle REVOKE - clear the assignment
        if assigned_email == "REVOKE":
            # Get current template to retrieve history
            get_response = table.get_item(Key={'templateID': template_id})
            current_item = get_response.get('Item', {})
            history = current_item.get('AssignmentHistory', [])
            
            # Add revoke to history
            history.append({
                "action": "revoked",
                "by": actor_email,
                "date": current_time
            })
            
            response = table.update_item(
                Key={
                    'templateID': template_id
                },
                UpdateExpression="REMOVE AssignedTo, AssignedRole SET AssignmentHistory = :history",
                ExpressionAttributeValues={
                    ':history': history
                },
                ReturnValues="UPDATED_NEW"
            )
            return {
                "statusCode": 200,
                "body": json.dumps({"message": f"Assignment for template {template_id} has been revoked.", "updatedAttributes": response.get('Attributes')})
            }

        if not assigned_email:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "assignedEmail is required for assignment"})
            }

        # Get current template to retrieve history
        get_response = table.get_item(Key={'templateID': template_id})
        current_item = get_response.get('Item', {})
        history = current_item.get('AssignmentHistory', [])
        
        # Add assignment to history
        history.append({
            "action": "assigned",
            "to": assigned_email,
            "by": actor_email,
            "date": current_time,
            "role": assigned_role
        })

        # Update the item with the new AssignedTo, AssignedRole values and history
        # Also store RequestedBy (the person who requested the review/approval)
        response = table.update_item(
            Key={
                'templateID': template_id
            },
            UpdateExpression="SET AssignedTo = :email, AssignedRole = :role, AssignedDate = :date, AssignmentHistory = :history, ApprovalStatus = :status, RequestedBy = :requester, RequestedByName = :requesterName",
            ExpressionAttributeValues={
                ':email': assigned_email,
                ':role': assigned_role,
                ':date': current_time,
                ':history': history,
                ':status': 'pending',
                ':requester': actor_email,
                ':requesterName': actor_email.split('@')[0] if actor_email else ''
            },
            ReturnValues="UPDATED_NEW"
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Template with ID {template_id} updated successfully.",
                "updatedAttributes": response.get('Attributes'),
                "assignedDate": current_time
            })
        }

    except ClientError as e:
        # Handle any errors from DynamoDB
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
