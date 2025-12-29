import json
import boto3
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
template_test_table = dynamodb.Table('testTransactions')


def lambda_handler(event, context):
    """
    Check the status of a test before allowing it to start.
    
    Returns:
        - 200 with canStart=True if status is "Not Started"
        - 200 with canStart=False and status message if "Completed" or "Terminated"
        - 404 if test ID not found
        - 400 if testID is missing
    """
    try:
        test_id = event.get('testID')
        if not test_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': 'testID is required'
                })
            }

        # Fetch test record for the given testID
        response = template_test_table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        test_items = response.get('Items', [])

        if not test_items:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'error': f'No test found for testID: {test_id}',
                    'canStart': False
                })
            }

        status = test_items[0].get('status', 'Not Started')

        # Check if test can be started
        if status == "Not Started":
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'canStart': True,
                    'status': status,
                    'message': 'Test can be started'
                })
            }
        elif status == "Completed":
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'canStart': False,
                    'status': status,
                    'message': 'This test has already been completed.'
                })
            }
        elif status == "Terminated":
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'canStart': False,
                    'status': status,
                    'message': 'This test has been terminated. Please contact your recruiter for more details.'
                })
            }
        elif status == "In Progress":
            # Allow resuming tests that are in progress
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'canStart': True,
                    'status': status,
                    'message': 'Test is in progress, resuming...'
                })
            }
        else:
            # Unknown status - default to not allowing start
            return {
                'statusCode': 200,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'canStart': False,
                    'status': status,
                    'message': f'Test status is: {status}'
                })
            }

    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'error': f'An error occurred: {str(e)}',
                'canStart': False
            })
        }
