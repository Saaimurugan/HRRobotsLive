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
        
        timestamp = datetime.utcnow().isoformat()
        history_id = f"{template_id}#{timestamp}"
        
        item = {
            'historyID': history_id,
            'templateID': template_id,
            'action': action,
            'performedBy': performed_by,
            'performedByName': performed_by_name,
            'timestamp': timestamp,
            'details': details
        }
        
        table.put_item(Item=item)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Template history logged successfully',
                'historyID': history_id
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
