import json
import boto3
import uuid
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
    
    # Check if an answer already exists for this testID and questionID
    existing_answers = fetch_all_items(
        answers_table, 
        Attr('questionID').eq(question_id) & Attr('testID').eq(test_id)
    )

    try:
        if existing_answers:
            # Update existing answer instead of creating a new one
            answer_ID = existing_answers[0]['answerID']
            answers_table.update_item(
                Key={'answerID': answer_ID},
                UpdateExpression='SET answer = :answer, #ts = :timestamp',
                ExpressionAttributeNames={'#ts': 'timestamp'},
                ExpressionAttributeValues={
                    ':answer': answer,
                    ':timestamp': str(datetime.datetime.now())
                }
            )
        else:
            # Create new answer record
            answer_ID = str(uuid.uuid4())
            answers_table.put_item(
                Item={
                    'answerID': answer_ID,
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
