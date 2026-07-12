import boto3
import json
import logging
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Table names
MCQ_TABLE = 'MCQQuestions'
ANSWER_TABLE = 'MCQAnswers'
TEMPLATE_TABLE = 'template'

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def lambda_handler(event, context):
    """
    Comprehensive cleanup of ALL orphaned questions:
    1. Questions that reference non-existent templates
    2. Questions that are not associated with any template
    3. Answers that reference non-existent questions
    4. Answers that are not associated with any question
    """
    mcq_table = dynamodb.Table(MCQ_TABLE)
    answer_table = dynamodb.Table(ANSWER_TABLE)
    template_table = dynamodb.Table(TEMPLATE_TABLE)
    
    deleted_questions_count = 0
    deleted_answers_count = 0
    checked_questions_count = 0
    checked_answers_count = 0
    errors = []
    
    try:
        logger.info("Starting comprehensive orphaned questions cleanup")
        
        # Step 1: Get all valid templateIDs from the template table
        logger.info("Step 1: Fetching all valid template IDs")
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
        
        logger.info(f"Found {len(valid_template_ids)} valid templates")
        
        # Step 2: Scan and delete questions with invalid/missing templateIDs
        logger.info("Step 2: Scanning MCQQuestions table for orphaned questions")
        valid_question_ids = set()
        
        response = mcq_table.scan(ProjectionExpression='questionID, templateID')
        
        while True:
            items = response.get('Items', [])
            
            for item in items:
                checked_questions_count += 1
                question_id = item.get('questionID')
                template_id = item.get('templateID')
                
                # Check if question has a templateID and if it's valid
                if not template_id or template_id not in valid_template_ids:
                    # Delete orphaned question
                    try:
                        mcq_table.delete_item(Key={'questionID': question_id})
                        deleted_questions_count += 1
                        
                        if deleted_questions_count % 10 == 0:
                            logger.info(f"Progress: Deleted {deleted_questions_count} orphaned questions")
                        
                        if not template_id:
                            logger.info(f"Deleted question {question_id} - no templateID")
                        else:
                            logger.info(f"Deleted question {question_id} - invalid template {template_id}")
                    except Exception as delete_error:
                        error_msg = f"Failed to delete question {question_id}: {str(delete_error)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
                else:
                    # This is a valid question, keep track of it
                    valid_question_ids.add(question_id)
            
            # Handle pagination
            if 'LastEvaluatedKey' in response:
                response = mcq_table.scan(
                    ProjectionExpression='questionID, templateID',
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
            else:
                break
        
        logger.info(f"Completed question cleanup: {deleted_questions_count} deleted, {len(valid_question_ids)} valid")
        
        # Step 3: Delete answers that reference non-existent questions
        logger.info("Step 3: Scanning MCQAnswers table for orphaned answers")
        
        response = answer_table.scan(ProjectionExpression='answerID, questionID')
        
        while True:
            items = response.get('Items', [])
            
            for item in items:
                checked_answers_count += 1
                answer_id = item.get('answerID')
                question_id = item.get('questionID')
                
                # Check if answer has a questionID and if it's valid
                if not question_id or question_id not in valid_question_ids:
                    # Delete orphaned answer
                    try:
                        # Answer table uses composite key (answerID + questionID)
                        answer_table.delete_item(Key={
                            'answerID': answer_id,
                            'questionID': question_id if question_id else 'NONE'
                        })
                        deleted_answers_count += 1
                        
                        if deleted_answers_count % 10 == 0:
                            logger.info(f"Progress: Deleted {deleted_answers_count} orphaned answers")
                        
                        if not question_id:
                            logger.info(f"Deleted answer {answer_id} - no questionID")
                        else:
                            logger.info(f"Deleted answer {answer_id} - invalid question {question_id}")
                    except Exception as delete_error:
                        error_msg = f"Failed to delete answer {answer_id}: {str(delete_error)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
            
            # Handle pagination
            if 'LastEvaluatedKey' in response:
                response = answer_table.scan(
                    ProjectionExpression='answerID, questionID',
                    ExclusiveStartKey=response['LastEvaluatedKey']
                )
            else:
                break
        
        logger.info(f"Completed answer cleanup: {deleted_answers_count} deleted")
        
        result = {
            "status": "success",
            "deleted_questions": deleted_questions_count,
            "deleted_answers": deleted_answers_count,
            "checked_questions": checked_questions_count,
            "checked_answers": checked_answers_count,
            "valid_templates": len(valid_template_ids),
            "valid_questions": len(valid_question_ids),
            "errors": errors if errors else None
        }
        
        logger.info(f"Cleanup completed: {result}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    
    except Exception as e:
        error_message = f"Cleanup failed: {str(e)}"
        logger.error(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'message': error_message,
                'deleted_questions': deleted_questions_count,
                'deleted_answers': deleted_answers_count,
                'checked_questions': checked_questions_count,
                'checked_answers': checked_answers_count
            })
        }
