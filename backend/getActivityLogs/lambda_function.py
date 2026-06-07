import boto3
import json
from datetime import datetime, timedelta
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
logs_table = dynamodb.Table("activityLogs")

class DecimalEncoder(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, Decimal):
            return float(o)
        return super(DecimalEncoder, self).default(o)

def lambda_handler(event, context):
    """
    Retrieve activity logs from DynamoDB
    
    Query parameters:
    - email: (optional) Filter by specific user email
    - activity: (optional) Filter by activity type (CreateJD, ProfilerPage, CandidateSpecificTest)
    - action: (optional) Filter by action type
    - days: (optional) Number of days to look back (default: 7)
    - limit: (optional) Maximum number of logs to return (default: 100, max: 1000)
    """
    try:
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        email_filter = body.get('email')
        activity_filter = body.get('activity')
        action_filter = body.get('action')
        days = int(body.get('days', 7))
        limit = min(int(body.get('limit', 100)), 1000)
        
        # Calculate date range
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(days=days)
        start_timestamp = start_time.isoformat()
        end_timestamp = end_time.isoformat()
        
        # Query logs
        logs = []
        
        if email_filter:
            # Query by email (if email is a partition key or GSI)
            response = logs_table.query(
                KeyConditionExpression='email = :email AND #ts BETWEEN :start AND :end',
                ExpressionAttributeNames={'#ts': 'timestamp'},
                ExpressionAttributeValues={
                    ':email': email_filter,
                    ':start': start_timestamp,
                    ':end': end_timestamp
                },
                Limit=limit,
                ScanIndexForward=False  # Most recent first
            )
            logs = response.get('Items', [])
        else:
            # Scan all logs (less efficient but works without GSI)
            response = logs_table.scan(
                FilterExpression='#ts BETWEEN :start AND :end',
                ExpressionAttributeNames={'#ts': 'timestamp'},
                ExpressionAttributeValues={
                    ':start': start_timestamp,
                    ':end': end_timestamp
                },
                Limit=limit
            )
            logs = response.get('Items', [])
        
        # Apply additional filters
        if activity_filter:
            logs = [log for log in logs if log.get('activity') == activity_filter]
        
        if action_filter:
            logs = [log for log in logs if log.get('action') == action_filter]
        
        # Sort by timestamp (most recent first)
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        
        # Aggregate statistics
        stats = {
            "total_logs": len(logs),
            "by_activity": {},
            "by_action": {},
            "by_user": {},
            "by_status": {}
        }
        
        for log in logs:
            activity = log.get('activity', 'unknown')
            action = log.get('action', 'unknown')
            user = log.get('email', 'unknown')
            status = log.get('details', {}).get('status', 'unknown')
            
            stats["by_activity"][activity] = stats["by_activity"].get(activity, 0) + 1
            stats["by_action"][action] = stats["by_action"].get(action, 0) + 1
            stats["by_user"][user] = stats["by_user"].get(user, 0) + 1
            stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "logs": logs,
                "stats": stats,
                "count": len(logs),
                "query_period": {
                    "start": start_timestamp,
                    "end": end_timestamp,
                    "days": days
                }
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        print(f"Error retrieving activity logs: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"Error retrieving activity logs: {str(e)}"})
        }
