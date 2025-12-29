import json
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
template_test_table = dynamodb.Table('testTransactions')

# Map termination reason codes to human-readable messages
TERMINATION_REASONS = {
    'timeout': 'Time limit exceeded',
    'fullscreen': 'Fullscreen mode was exited',
    'window': 'Window focus was lost',
    'camera': 'Camera access was denied',
    'mic': 'Microphone access was denied',
    'face': 'Too many face detection warnings',
    'multiplefaces': 'Multiple faces detected',
    'screenshot': 'Screenshot attempt detected'
}

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        termination_reason = event.get('terminationReason', '')

        # Fetch template IDs for the given testID
        response = template_test_table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        template_items = response.get('Items', [])
        
        if not template_items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No templates found for testID: {test_id}')
            }
        
        status = template_items[0]['status']

        if status == "In Progress":
            status = "Terminated"
            
            # Get human-readable reason message
            reason_message = TERMINATION_REASONS.get(termination_reason, termination_reason or 'Unknown reason')
            
            template_test_table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status, terminationReason = :reason',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':new_status': status,
                    ':reason': reason_message
                }
            )
             
        return {
            'statusCode': 200,
            'body': json.dumps(f'Status changed to Terminated: {test_id}')
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }
