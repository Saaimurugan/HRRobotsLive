import boto3
from boto3.dynamodb.conditions import Key
import logging

# Initialize the DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Define the table names
TEST_TRANSACTIONS_TABLE = 'testTransactions'
TEMPLATE_TABLE = 'template'

def lambda_handler(event, context):
    test_table = dynamodb.Table(TEST_TRANSACTIONS_TABLE)
    template_table = dynamodb.Table(TEMPLATE_TABLE)

    # Step 1: Get all valid templateIDs from the template table
    valid_template_ids = set()
    response = template_table.scan(ProjectionExpression='templateID')
    for item in response.get('Items', []):
        valid_template_ids.add(item['templateID'])

    # Handle pagination if necessary in template table
    while 'LastEvaluatedKey' in response:
        response = template_table.scan(
            ProjectionExpression='templateID',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            valid_template_ids.add(item['templateID'])

    # Step 2: Scan testTransactions and delete entries with invalid templateIDs
    deleted_count = 0
    response = test_table.scan(ProjectionExpression='testID, templateID')
    for item in response.get('Items', []):
        template_id = item.get('templateID')
        test_id = item.get('testID')

        if template_id not in valid_template_ids:
            test_table.delete_item(Key={'testID': test_id})
            deleted_count += 1
            logging.info(f"Deleted test with ID {test_id} due to missing template {template_id}")

    # Handle pagination in testTransactions table as well
    while 'LastEvaluatedKey' in response:
        response = test_table.scan(
            ProjectionExpression='testID, templateID',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            template_id = item.get('templateID')
            test_id = item.get('testID')

            if template_id not in valid_template_ids:
                test_table.delete_item(Key={'testID': test_id})
                deleted_count += 1
                logging.info(f"Deleted test with ID {test_id} due to missing template {template_id}")

    print(logging)
    return {
        'statusCode': 200,
        'body': f'Deleted {deleted_count} testTransactions with invalid templateIDs.'
    }
