import boto3
import json
import uuid
import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

# Custom JSON encoder to handle Decimal types from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Tables
table = dynamodb.Table("testTransactions")
mcq_answers_table = dynamodb.Table('MCQAnswers')
mcq_questions_table = dynamodb.Table('MCQQuestions')
savedResult_table = dynamodb.Table("savedResult_table_name")
config_table = dynamodb.Table('testConfiguration')

# Initialize Lambda client
lambda_client = boto3.client('lambda')

def getAllQuestions(template_ID):
    questions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID)
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = mcq_questions_table.scan(**scan_params)
        questions.extend(response.get('Items', []))
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break

    return questions

def getAllAnswers(test_id):
    answers = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('testID').eq(test_id)
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = mcq_answers_table.scan(**scan_params)
        answers.extend(response.get('Items', []))
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break

    return answers

def calculate_score(test_id, template_ID):
    answers = getAllAnswers(test_id)
    questions = getAllQuestions(template_ID)
    question_dict = {q['questionID']: q for q in questions}

    report = []
    for answer in answers:
        question_id = answer['questionID']
        submitted_answer = answer['answer']

        question = question_dict.get(question_id)
        if not question:
            report.append({
                "questionID": question_id,
                "error": "Question not found",
            })
            continue
        else:
            correct_answer = question['correctAnswer']
            is_correct = submitted_answer == correct_answer

            if submitted_answer != "":
                report.append({
                    "questionID": question_id,
                    "question": question['question'],
                    "submittedAnswer": submitted_answer,
                    "correctAnswer": correct_answer,
                    "isCorrect": is_correct
                })
    return report

def get_test_configuration(template_id):
    """Get test configuration from DynamoDB, return defaults if not found"""
    try:
        response = config_table.query(
            KeyConditionExpression=Key('TemplateConfigurationID').eq(template_id)
        )
        items = response.get('Items', [])
        if items:
            config = items[0]
            return {
                'numberOfQuestions': int(config.get('numberOfQuestions', 10)),
                'testDuration': int(config.get('testDuration', 60)),
                'sensitivityLevel': int(config.get('sensitivityLevel', 5)),
                'allowedDefaults': int(config.get('allowedDefaults', 10))
            }
    except Exception:
        pass
    # Return defaults if configuration not found
    return {
        'numberOfQuestions': 10,
        'testDuration': 60,
        'sensitivityLevel': 5,
        'allowedDefaults': 10
    }

def count_submitted_and_correct_answers(report, candidate_Name, test_id, total_questions=10):
    submitted_answers = sum(1 for entry in report if entry.get("submittedAnswer"))
    correct_answers = sum(1 for entry in report if entry.get("isCorrect") is True)

    return {
        "testID": test_id,
        "candidateName": candidate_Name,
        "totalQuestions": total_questions,
        "submittedAnswers": submitted_answers,
        "correctAnswers": correct_answers
    }

def save_result_to_dynamodb(test_id, report, result_summary):
    # Check if record already exists for this testID
    check_response = savedResult_table.scan(FilterExpression=Attr('testID').eq(test_id))
    existing_items = check_response.get('Items', [])
    
    if existing_items:
        # Update existing record with resultSummary
        existing_item = existing_items[0]
        savedResult_table.update_item(
            Key={'savedResultId': existing_item['savedResultId']},
            UpdateExpression='SET report = :report, resultSummary = :summary, updatedAt = :updated',
            ExpressionAttributeValues={
                ':report': report,
                ':summary': result_summary,
                ':updated': str(datetime.datetime.now())
            }
        )
    else:
        # Create new record
        uuidkey = str(uuid.uuid4())
        item = {
            'savedResultId': uuidkey,
            'report': report,
            'resultSummary': result_summary,
            'testID': test_id,
            'createdAt': str(datetime.datetime.now())
        }
        savedResult_table.put_item(Item=item)
    return

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        response = table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        
        items = response.get('Items', [])
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No test found for testID: {test_id}')
            }
        
        status = items[0].get('status')
        template_ID = items[0].get('templateID')
        candidate_Name = items[0].get('candidateName')
        
        # Get test configuration for numberOfQuestions
        config = get_test_configuration(template_ID)
        total_questions = config['numberOfQuestions']
            
        if status == "In Progress":
            # Update status to Completed
            table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':new_status': 'Completed'}
            )

            # Calculate score and save results
            report = calculate_score(test_id, template_ID)
            result_summary = count_submitted_and_correct_answers(report, candidate_Name, test_id, total_questions)
            save_result_to_dynamodb(test_id, report, result_summary)

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Test submitted and score calculated successfully',
                    'result': result_summary
                }, cls=DecimalEncoder)
            }
        elif status in ["Completed", "Terminated"]:
            # Calculate and save results if not already saved (fallback for checkResult)
            report = calculate_score(test_id, template_ID)
            result_summary = count_submitted_and_correct_answers(report, candidate_Name, test_id, total_questions)
            save_result_to_dynamodb(test_id, report, result_summary)

            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'Score calculated successfully',
                    'result': result_summary
                }, cls=DecimalEncoder)
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test status for testID {test_id} is {status}.')
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }            