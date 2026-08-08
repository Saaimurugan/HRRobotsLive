import json
import boto3
from botocore.exceptions import ClientError
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda', region_name='us-east-1')

table = dynamodb.Table('template')
user_table = dynamodb.Table('userDetails')


def is_user_registered(email):
    """Return True if the email exists in userDetails, False otherwise."""
    response = user_table.get_item(Key={"userId": email})
    return "Item" in response


def send_email_async(recipient_email, subject, body_html):
    """Fire-and-forget: invoke sendEmailSMTP asynchronously so it never blocks."""
    try:
        lambda_client.invoke(
            FunctionName="sendEmailSMTP",
            InvocationType="Event",
            Payload=json.dumps({
                "recipient_email": recipient_email,
                "subject": subject,
                "body": body_html,
            }),
        )
    except Exception as e:
        print(f"Warning: failed to invoke sendEmailSMTP: {e}")


def build_assign_invite_html(inviter_email, role):
    role_meta = {
        "hiring_manager": {
            "label": "Reviewer",
            "description": (
                "As a Reviewer, you can review and edit the template questions, "
                "approve the template, and create test links for candidates."
            ),
        },
        "recruiter": {
            "label": "Recruiter",
            "description": "As a Recruiter, you can create test links for candidates using this template.",
        },
    }
    meta = role_meta.get(role, role_meta["recruiter"])
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.hrrobots.click/logo.png" alt="HR Robots Logo" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #1cbbb4;">You're Invited to HR Robots!</h2>
          <p>Hello,</p>
          <p><strong>{inviter_email}</strong> has assigned you a screening test template as a
             <strong>{meta['label']}</strong> and invited you to join HR Robots platform.</p>
          <p>{meta['description']}</p>
          <p>HR Robots helps streamline your hiring process with AI-powered tools for candidate
             profiling, interviews, and more.</p>
          <p style="margin-top: 20px;">
            <a href="https://www.hrrobots.click/signup"
               style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                      color: white; padding: 12px 24px; text-decoration: none;
                      border-radius: 6px; display: inline-block;">
              Get Started
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Sign up to access the template that has been assigned to you.
          </p>
        </div>
    """


def build_approval_html(approver_email):
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.hrrobots.click/logo.png" alt="HR Robots Logo" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #16a34a;">Template Approved! &#10003;</h2>
          <p>Hello,</p>
          <p>Great news! Your screening test template has been reviewed and
             <strong>approved</strong> by <strong>{approver_email}</strong>.</p>
          <p>The template is now ready for use. You can start generating test links for candidates.</p>
          <p style="margin-top: 20px;">
            <a href="https://www.hrrobots.click/list"
               style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
                      color: white; padding: 12px 24px; text-decoration: none;
                      border-radius: 6px; display: inline-block;">
              View Templates
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Thank you for using HR Robots!
          </p>
        </div>
    """


def lambda_handler(event, context):

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
        
        # Normalize emails to lowercase for case-insensitive comparison
        if assigned_email and assigned_email != "REVOKE":
            assigned_email = assigned_email.lower().strip()
        if actor_email:
            actor_email = actor_email.lower().strip()

        current_time = datetime.utcnow().isoformat() + "Z"

        if not template_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "templateID is required"})
            }

        # Handle APPROVE action
        if action == "approve":
            # Get current template to retrieve history and current assignment
            get_response = table.get_item(Key={'templateID': template_id})
            current_item = get_response.get('Item', {})
            history = current_item.get('AssignmentHistory', [])
            current_assigned_role = current_item.get('AssignedRole', 'recruiter')
            
            # Add approval to history
            history.append({
                "action": "approved",
                "by": actor_email,
                "byName": actor_name,
                "date": current_time,
                "role": current_assigned_role
            })
            
            # After approval, clear AssignedTo so it no longer shows in reviewer's list
            # The template will only show to the original owner
            try:
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
                    ReturnValues="ALL_NEW"  # Changed from UPDATED_NEW to ALL_NEW to see all attributes
                )
            except ClientError as e:
                # If AssignedTo or AssignedRole don't exist, that's okay
                if e.response['Error']['Code'] == 'ValidationException':
                    # Try without REMOVE if fields don't exist
                    response = table.update_item(
                        Key={
                            'templateID': template_id
                        },
                        UpdateExpression="SET ApprovedBy = :approver, ApprovedByName = :approverName, ApprovedDate = :date, ApprovalStatus = :status, AssignmentHistory = :history",
                        ExpressionAttributeValues={
                            ':approver': actor_email,
                            ':approverName': actor_name,
                            ':date': current_time,
                            ':status': 'approved',
                            ':history': history
                        },
                        ReturnValues="ALL_NEW"
                    )
                else:
                    raise
            
            # Log the updated item for debugging
            print(f"Template after approval: {json.dumps(response.get('Attributes'))}")

            # Notify the template owner that their template was approved.
            # 'RequestedBy' holds the owner's email (stored at assign time).
            owner_email = response.get('Attributes', {}).get('RequestedBy') or \
                          current_item.get('email', '')
            if owner_email and owner_email != actor_email:
                send_email_async(
                    recipient_email=owner_email,
                    subject=f"Your template has been approved by {actor_email}",
                    body_html=build_approval_html(actor_email),
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

        # If the assignee is not yet registered, send them a platform invite email
        if not is_user_registered(assigned_email):
            send_email_async(
                recipient_email=assigned_email,
                subject=f"{actor_email} assigned you a template on HR Robots",
                body_html=build_assign_invite_html(actor_email, assigned_role),
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
