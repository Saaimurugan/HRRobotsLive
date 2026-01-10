import boto3
import json
import datetime

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
user_table = dynamodb.Table('userDetails')
deleted_users_table = dynamodb.Table('DeletedUsers')

def lambda_handler(event, context):
    """
    Delete user account and store deletion record with reason.
    Expected input:
    {
        "email": "user@example.com",
        "reason": "string",
        "token": "JWT token"
    }
    """
    try:
        # Parse input
        email = event.get('email')
        reason = event.get('reason', 'No reason provided')
        
        # Validate required fields
        if not email:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'Missing required field: email'})
            }
        
        # Check if user exists
        response = user_table.get_item(Key={'userId': email})
        
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({'error': 'User not found'})
            }
        
        user_data = response['Item']
        
        # Store deletion record (for audit purposes)
        deleted_users_table.put_item(
            Item={
                'userId': email,
                'reason': reason,
                'deletedAt': datetime.datetime.now().isoformat(),
                'createdAt': user_data.get('createdAt', 'Unknown')
            }
        )
        
        # Delete user from userDetails table
        user_table.delete_item(Key={'userId': email})
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Account deleted successfully'
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
            'body': json.dumps({'error': f'Failed to delete account: {str(e)}'})
        }
