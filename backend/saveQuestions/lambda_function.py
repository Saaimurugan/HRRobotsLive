import json
import boto3
import uuid
from boto3.dynamodb.conditions import Key
import datetime	
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
template_table = dynamodb.Table('template')

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

def lambda_handler(event, context):
    try:
        template_ID = event.get('templateID')

        print(template_ID);

        if not template_ID:
            template_ID = str(uuid.uuid4())  # Generate a unique ID for each question
        
        template_Name = event.get('templateName')

        if not template_Name:
            return {
                'statusCode': 400,
                'message': 'Missing templateName in the request.'
            }

        email = event.get('globalValue')

        if not email:
            return {
                'statusCode': 400,
                'message': 'Missing globalValue (email) in the request.'
            }
        
        # email = "sangeeta.mandal@mpslimited.com"

        # Check if the template already exists
        response = template_table.get_item(Key={"templateID": template_ID})
        existing_template = response.get("Item")

        if not existing_template:
            # Create a template item on DynamoDB
            template_table.put_item(
                Item={
                    "templateID": template_ID,
                    "templateName": template_Name,
                    "email": email,
                    "datetime": str(datetime.datetime.now())
                }
            )
        else:
            # Update the existing template item on DynamoDB
            template_table.update_item(
                Key={"templateID": template_ID},
                UpdateExpression="SET templateName = :name, email = :email, #dt = :dt",
                ExpressionAttributeNames={"#dt": "datetime"},  # 'datetime' is a reserved keyword in DynamoDB
                ExpressionAttributeValues={
                    ":name": template_Name,
                    ":email": email,
                    ":dt": str(datetime.datetime.now())
                }
            )

        questions = event.get('questions', [])

        if not questions:
            return {
                'statusCode': 400,
                'message': json.dumps('No questions provided')
            }

        # get all questions of the provided template_ID
        items_to_delete = getAllQuestions(template_ID)

        # Delete questions matching the templateID (including sample questions)
        i = 0
        for item in items_to_delete:
            i = i+1
            print(i)
            questions_table.delete_item(
                Key={
                    'questionID': item['questionID']
                }
        )
        
        # Filter out ALL sample questions before saving
        # Check both the flag and question text patterns
        filtered_questions = []
        for question in questions:
            # Skip if marked as sample question
            if question.get('isSampleQuestion', False):
                continue
            # Skip if question text contains sample question patterns
            question_text = question.get('question', '').lower()
            if 'sample question:::' in question_text or question_text.startswith('sample question'):
                continue
            filtered_questions.append(question)
        
        # Create only non-sample questions
        for question in filtered_questions:
            question_ID = str(uuid.uuid4())  # Generate a unique ID for each question
            questions_table.put_item(
                Item={
                    'questionID': question_ID,
                    'templateID': template_ID,
                    'question': question.get('question'),
                    'options': question.get('options'),
                    'correctAnswer': question.get('correctAnswer'),
                    "datetime": str(datetime.datetime.now())
                }
            )

        return {
            'statusCode': 200,
            'message': json.dumps('Questions saved successfully'),
            'templateID': template_ID
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'message': json.dumps(f'Error saving questions: {str(e)}')
        }
