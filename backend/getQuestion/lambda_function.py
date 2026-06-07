import json
import boto3
import random
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')

def getAllQuestions(template_ID):
    questions = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = questions_table.scan(**scan_params)

        # Append fetched items
        questions.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return questions  # Returns all records

def getAllPreviousAnswers(test_id):
    answers = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('testID').eq(test_id)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = answers_table.scan(**scan_params)

        # Append fetched items
        answers.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return answers  # Returns all records

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')

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
        
        template_ids = [item['templateID'] for item in template_items]
        status = template_items[0]['status']

        if status == "Terminated":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test Terminated, please contact your recruiter for more details - ({test_id}).')
            }
        
        if status == "Completed":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test already completed - ({test_id}).')
            }
        
        if status == "Not Started":
            status = "In Progress"
            template_test_table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':new_status': status}
            )
        
        # Fetch questions for the first template ID
        # response = questions_table.scan(
        #    FilterExpression=Attr('templateID').eq(template_ids[0])
        #)
        #questions = response.get('Items', [])
        questions = getAllQuestions(template_ids[0])
        
        if not questions:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No questions found for templateID: {template_ids[0]}')
            }
        
        # Fetch all previously answered questions and their answers
        #answer_response = answers_table.scan(
        #    FilterExpression=Attr('testID').eq(test_id)
        #)
        #previous_answers = answer_response.get('Items', [])
        previous_answers = getAllPreviousAnswers(test_id)
        previous_questions = []
        previous_answers_dict = {}
        
        for answer in previous_answers:
            question_id = answer['questionID']
            previous_answers_dict[question_id] = answer['answer']
        
        for question in questions:
            if question['questionID'] in previous_answers_dict:
                question_copy = question.copy()
                question_copy.pop("correctAnswer", None)
                previous_questions.append(question_copy)
        
        # Select a new question randomly
        unchecked_questions = [q for q in questions if q['questionID'] not in previous_answers_dict]
        
        if unchecked_questions:
            new_question = random.choice(unchecked_questions)
            new_question.pop("correctAnswer", None)
        else:
            new_question = "No more questions available!"
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'new_question': new_question,
                'previous_questions': previous_questions,
                'previous_answers': [previous_answers_dict[q['questionID']] for q in previous_questions],
                'question_count': len(previous_answers)
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }
