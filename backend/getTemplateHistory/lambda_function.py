import boto3
import json
from boto3.dynamodb.conditions import Key
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
    Get template history
    Expected event structure:
    {
        "templateID": "string"
    }
    """
    try:
        template_id = event.get('templateID')
        
        if not template_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'templateID is required'})
            }
        
        # Query directly using partition key (templateID)
        # No GSI needed - templateID is the partition key
        response = table.query(
            KeyConditionExpression=Key('templateID').eq(template_id),
            ScanIndexForward=True  # Sort by timestamp ascending (oldest first)
        )
        
        items = response.get('Items', [])
        
        # Format the history for display
        history = []
        for item in items:
            history_entry = {
                'action': item.get('action'),
                'performedBy': item.get('performedBy'),
                'performedByName': item.get('performedByName'),
                'timestamp': item.get('timestamp'),
                'details': item.get('details', {})
            }
            history.append(history_entry)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'templateID': template_id,
                'history': history
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
