import boto3
import json
import datetime
import uuid

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
logs_table = dynamodb.Table("activityLogs")

def lambda_handler(event, context):
    """
    Log user activities to DynamoDB
    
    Expected body:
    {
        "email": "user@example.com",
        "activity": "CreateJD|ProfilerPage|CandidateSpecificTest",
        "action": "form_submitted|report_generated|test_created|file_uploaded",
        "details": {
            "roleName": "...",
            "candidateName": "...",
            "templateName": "...",
            "status": "success|error|warning",
            "message": "...",
            "duration": 1234,  // milliseconds
            "errorMessage": "..."
        },
        "token": "JWT_TOKEN"
    }
    """
    try:
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        email = body.get('email', 'unknown').lower().strip()
        activity = body.get('activity', 'unknown')
        action = body.get('action', 'unknown')
        details = body.get('details', {})
        
        # Validate required fields
        if not email or email == 'unknown':
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Email is required"})
            }
        
        # Create log entry
        log_id = str(uuid.uuid4())
        timestamp = datetime.datetime.utcnow().isoformat()
        
        log_entry = {
            "logId": log_id,
            "email": email,
            "activity": activity,
            "action": action,
            "timestamp": timestamp,
            "details": details,
            "ttl": int((datetime.datetime.utcnow() + datetime.timedelta(days=90)).timestamp())  # Auto-delete after 90 days
        }
        
        # Save to DynamoDB
        logs_table.put_item(Item=log_entry)
        
        print(f"Activity logged: {email} - {activity} - {action}")
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Activity logged successfully",
                "logId": log_id
            })
        }
        
    except Exception as e:
        print(f"Error logging activity: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"Error logging activity: {str(e)}"})
        }
