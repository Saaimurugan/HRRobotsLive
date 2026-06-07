import boto3
import os

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table_name = os.getenv('TABLE_NAME', 'MCQAnswers')  # Use environment variable
table = dynamodb.Table(table_name)

def delete_all_records():
    """ Deletes all records from the MCQAnswers table """
    try:
        # Scan the table to get all items (use pagination)
        response = table.scan()
        items = response.get('Items', [])

        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))

        # Retrieve primary key schema
        key_schema = table.key_schema  # [{'AttributeName': 'id', 'KeyType': 'HASH'}]
        primary_keys = [k['AttributeName'] for k in key_schema]  # Extract key names

        # Delete each item using only primary key attributes
        for item in items:
            key = {k: item[k] for k in primary_keys if k in item}  # Ensure valid key
            table.delete_item(Key=key)

        return {"status": "success", "deleted_records": len(items)}

    except Exception as e:
        return {"status": "error", "message": str(e)}

def lambda_handler(event, context):
    """ AWS Lambda handler function """
    result = delete_all_records()
    return {
        "statusCode": 200 if result["status"] == "success" else 500,
        "body": result
    }
