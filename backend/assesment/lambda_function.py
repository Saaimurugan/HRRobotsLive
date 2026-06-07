import json
import boto3
import random
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')

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
    try:
        test_id = event.get('testID')
        candidate_name = event.get('candidateName')
        
        # Fetch template IDs and status for the given testID
        test_data = fetch_all_items(template_test_table, Attr('testID').eq(test_id))
        if not test_data:
            return {'statusCode': 404, 'body': json.dumps(f'No templates found for testID: {test_id}')}

        template_ids = [item['templateID'] for item in test_data]
        status = test_data[0]['status']

        if status == "Terminated":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test Terminated, please contact your recruiter for more details - ({test_id}).')
            }
            
        if status == "Completed":
            return {'statusCode': 404, 'body': json.dumps(f'Test already completed - ({test_id}).')}
        
        if status == "Not Started":
            template_test_table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status, #candidateName = :new_candidateName',
                ExpressionAttributeNames={'#status': 'status', '#candidateName': 'candidateName'},
                ExpressionAttributeValues={':new_status': "In Progress", ':new_candidateName': candidate_name}
            )

        # Fetch questions for the first template ID
        questions = fetch_all_items(questions_table, Attr('templateID').eq(template_ids[0]))
        if not questions:
            return {'statusCode': 404, 'body': json.dumps(f'No questions found for templateID: {template_ids[0]}')}

        # Fetch all answers for the test in one go
        answers = fetch_all_items(answers_table, Attr('testID').eq(test_id))
        answered_question_ids = {ans['questionID'] for ans in answers}  # Set for O(1) lookup

        # Select a new question that hasn't been answered
        unanswered_questions = [q for q in questions if q['questionID'] not in answered_question_ids]

        if unanswered_questions:
            question = random.choice(unanswered_questions)
            return {
                'statusCode': 200,
                'body': json.dumps({'question': question, 'question_count': len(answers) + 1})
            }
        else:
            return {'statusCode': 404, 'body': json.dumps({'question': "No more questions available!"})}

    except Exception as e:
        return {'statusCode': 500, 'body': json.dumps(f"An error occurred: {str(e)}")}
