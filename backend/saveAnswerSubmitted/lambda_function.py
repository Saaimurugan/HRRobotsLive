import json
import boto3
import datetime
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
answers_table = dynamodb.Table('MCQAnswers')

def fetch_all_items(table, filter_expression):
    """ Fetch all items from a table using scan with pagination. """
    items = []
    last_evaluated_key = None

    while True:
        scan_params = {'FilterExpression': filter_expression}
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = table.scan(**scan_params)
        items.extend(response.get('Items', []))

        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break  # No more pages

    return items
    
def lambda_handler(event, context):
    test_id = event.get('testID')
    question_id = event.get('questionID')
    answer = event.get('answer')
    
    if not test_id or not question_id or not answer:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing required fields: testID, questionID, or answer')
        }
    
    # Use testID_questionID as a deterministic answerID to prevent duplicates
    # This ensures the same question for the same test always has the same key
    answer_id = f"{test_id}_{question_id}"
    
    try:
        # Use put_item with the deterministic key - this will update if exists
        answers_table.put_item(
            Item={
                'answerID': answer_id,
                'questionID': question_id,
                'testID': test_id,
                'answer': answer,
                'timestamp': str(datetime.datetime.now())
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps('Answer saved successfully')
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f'Error saving answer: {str(e)}')
        }
