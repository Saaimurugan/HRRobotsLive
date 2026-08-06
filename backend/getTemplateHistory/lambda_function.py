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
    Get template history - auth handled by API Gateway AuthFunction authorizer.
    Expected event structure (via API Gateway proxy integration):
    {
        "body": "{\"templateID\": \"string\"}"
    }
    """
    try:
        # Handle API Gateway proxy integration
        if 'body' in event:
            data = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        else:
            data = event

        template_id = data.get('templateID')

        if not template_id:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'templateID is required'})
            }

        # Query directly using partition key (templateID)
        response = table.query(
            KeyConditionExpression=Key('templateID').eq(template_id),
            ScanIndexForward=True  # Sort by timestamp ascending (oldest first)
        )

        items = response.get('Items', [])

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
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({
                'templateID': template_id,
                'history': history
            }, cls=DecimalEncoder)
        }

    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'error': str(e)})
        }
