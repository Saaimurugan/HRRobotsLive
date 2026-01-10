import json
import boto3
import uuid
import datetime

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
feedback_table = dynamodb.Table('Feedback')

def lambda_handler(event, context):
    """
    Save feedback to DynamoDB Feedback table.
    Expected input:
    {
        "testID": "string",
        "rating": number (1-5),
        "comments": "string (optional)",
        "candidateName": "string (optional)"
    }
    """
    try:
        # Parse input
        test_id = event.get('testID')
        rating = event.get('rating')
        comments = event.get('comments', '')
        candidate_name = event.get('candidateName', '')
        
        # Validate required fields
        if not test_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Missing required field: testID'})
            }
        
        if rating is None or not isinstance(rating, (int, float)) or rating < 1 or rating > 5:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Rating must be a number between 1 and 5'})
            }
        
        # Generate unique feedback ID
        feedback_id = str(uuid.uuid4())
        
        # Save to DynamoDB
        feedback_table.put_item(
            Item={
                'feedbackID': feedback_id,
                'testID': test_id,
                'rating': int(rating),
                'comments': comments,
                'candidateName': candidate_name,
                'timestamp': datetime.datetime.now().isoformat()
            }
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Feedback saved successfully',
                'feedbackID': feedback_id
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
            'body': json.dumps({'error': f'Failed to save feedback: {str(e)}'})
        }
