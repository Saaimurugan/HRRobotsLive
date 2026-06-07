import json 
import boto3
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")
TRANSACTIONS_TABLE_NAME = "testTransactions"  # Replace with your actual transactions table name

transactions_table = dynamodb.Table(TRANSACTIONS_TABLE_NAME)

def getAllTemplates(e_mail):
    templates = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('email').eq(e_mail)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = transactions_table.scan(**scan_params)

        # Append fetched items
        templates.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return templates  # Returns all records

def lambda_handler(event, context):
    try:
        # Extract query parameters
        e_mail = event.get('globalValue')
        if not e_mail:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing email parameter'})
            }
        
        # Query records where email matches e_mail
        #response = transactions_table.scan(
        #    FilterExpression=Attr('email').eq(e_mail)
        #)
        
        #items = response.get('Items', [])
        items = getAllTemplates(e_mail)
        
        # Update each matching record's status to "complete"
        for item in items:
            transactions_table.update_item(
                Key={'testID': item['testID']},  # Ensure this is the primary key
                UpdateExpression='SET #s = :val1',
                ExpressionAttributeNames={'#s': 'status'},
                ExpressionAttributeValues={':val1': 'Completed'}
            )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Updated records successfully'})
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
