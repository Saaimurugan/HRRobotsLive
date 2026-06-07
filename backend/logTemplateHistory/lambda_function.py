import boto3
import json
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('templateInfo')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Log template history events
    Expected event structure:
    {
        "templateID": "string",
        "action": "created|assigned_for_review|approved|modified|assigned_to_recruiter",
        "performedBy": "email",
        "performedByName": "name",
        "details": {
            "assignedTo": "email",
            "assignedToName": "name",
            "assignedRole": "hiring_manager|recruiter",
            "modifications": "description of changes",
            "approverComments": "comments"
        }
    }
    """
    try:
        template_id = event.get('templateID')
        action = event.get('action')
        performed_by = event.get('performedBy')
        performed_by_name = event.get('performedByName', performed_by)
        details = event.get('details', {})
        
        if not template_id or not action or not performed_by:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'templateID, action, and performedBy are required'})
            }
        
        # Use ISO format with microseconds for better uniqueness
        timestamp = datetime.utcnow().isoformat()
        
        # Composite key: templateID (partition) + timestamp (sort)
        item = {
            'templateID': template_id,
            'timestamp': timestamp,
            'action': action,
            'performedBy': performed_by,
            'performedByName': performed_by_name,
            'details': details
        }
        
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Template history logged successfully',
                'templateID': template_id,
                'timestamp': timestamp
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
