import boto3
from boto3.dynamodb.conditions import Key
import logging

# Initialize the DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Define the table names
MCQ_TABLE = 'MCQQuestions'
ANSWER_TABLE = 'MCQAnswers'
TEMPLATE_TABLE = 'template'

def lambda_handler(event, context):
    mcq_table = dynamodb.Table(MCQ_TABLE)
    answer_table = dynamodb.Table(ANSWER_TABLE)
    template_table = dynamodb.Table(TEMPLATE_TABLE)

    # Step 1: Get all valid templateIDs from the template table
    valid_template_ids = set()
    response = template_table.scan(ProjectionExpression='templateID')
    for item in response.get('Items', []):
        valid_template_ids.add(item['templateID'])

    # Handle pagination for templates
    while 'LastEvaluatedKey' in response:
        response = template_table.scan(
            ProjectionExpression='templateID',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            valid_template_ids.add(item['templateID'])

    # Step 2: Delete questions that reference non-existent templates
    deleted_questions_count = 0
    valid_question_ids = set()
    
    response = mcq_table.scan(ProjectionExpression='questionID, templateID')
    for item in response.get('Items', []):
        question_id = item.get('questionID')
        template_id = item.get('templateID')

        if template_id not in valid_template_ids:
            mcq_table.delete_item(Key={'questionID': question_id})
            deleted_questions_count += 1
            logging.info(f"Deleted question with ID {question_id} due to missing template {template_id}")
        else:
            valid_question_ids.add(question_id)

    # Handle pagination for questions
    while 'LastEvaluatedKey' in response:
        response = mcq_table.scan(
            ProjectionExpression='questionID, templateID',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            question_id = item.get('questionID')
            template_id = item.get('templateID')

            if template_id not in valid_template_ids:
                mcq_table.delete_item(Key={'questionID': question_id})
                deleted_questions_count += 1
                logging.info(f"Deleted question with ID {question_id} due to missing template {template_id}")
            else:
                valid_question_ids.add(question_id)

    # Step 3: Delete answers that reference non-existent questions
    deleted_answers_count = 0
    response = answer_table.scan(ProjectionExpression='answerID, questionID')
    for item in response.get('Items', []):
        question_id = item.get('questionID')
        answer_id = item.get('answerID')

        if question_id not in valid_question_ids:
            answer_table.delete_item(Key={'answerID': answer_id, 'questionID': question_id})
            deleted_answers_count += 1
            logging.info(f"Deleted answer with ID {answer_id} due to missing question {question_id}")

    # Handle pagination for answers
    while 'LastEvaluatedKey' in response:
        response = answer_table.scan(
            ProjectionExpression='answerID, questionID',
            ExclusiveStartKey=response['LastEvaluatedKey']
        )
        for item in response.get('Items', []):
            question_id = item.get('questionID')
            answer_id = item.get('answerID')

            if question_id not in valid_question_ids:
                answer_table.delete_item(Key={'answerID': answer_id, 'questionID': question_id})
                deleted_answers_count += 1
                logging.info(f"Deleted answer with ID {answer_id} due to missing question {question_id}")

    return {
        'statusCode': 200,
        'body': f'Deleted {deleted_questions_count} MCQQuestions with invalid templateIDs and {deleted_answers_count} MCQAnswers with invalid questionIDs.'
    }
