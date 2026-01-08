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
template_table = dynamodb.Table('template')

# Initialize Lambda client
lambda_client = boto3.client('lambda')

def getAllQuestions(template_ID):
    """
    Updated to use separate topic field directly - NO MORE PARSING
    """
    questions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID)
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = mcq_questions_table.scan(**scan_params)
        
        # Process questions to ensure topic field exists
        items = response.get('Items', [])
        for item in items:
            # Ensure topic field exists - use default if missing
            if 'topic' not in item or not item['topic']:
                item['topic'] = '__NO_TOPIC__'
        
        questions.extend(items)
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
                    "topic": question.get('topic', '__NO_TOPIC__'),  # Include topic field
                    "submittedAnswer": submitted_answer,
                    "correctAnswer": correct_answer,
                    "isCorrect": is_correct
                })
    return report

def get_test_configuration(template_id):
    """Get test configuration from DynamoDB, return defaults if not found"""
    try:
        response = config_table.query(
            KeyConditionExpression=Key('testConfigurationID').eq(template_id)
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

def get_template_name(template_id):
    """Get the template name from the template table"""
    try:
        response = template_table.get_item(Key={"templateID": template_id})
        return response.get("Item", {}).get("templateName", "Unknown Template")
    except Exception:
        return "Unknown Template"

def send_recruiter_notification(test_data, status_type):
    """Send notification to recruiter about test completion/termination"""
    try:
        template_name = get_template_name(test_data.get('templateID', ''))
        
        notification_payload = {
            "testID": test_data.get('testID'),
            "candidateName": test_data.get('candidateName'),
            "templateName": template_name,
            "status": status_type,
            "recruiterEmail": test_data.get('email'),
            "datetime": str(datetime.datetime.now())
        }
        
        # Invoke notification lambda (async)
        lambda_client.invoke(
            FunctionName='sendRecruiterNotification',
            InvocationType='Event',  # Async invocation
            Payload=json.dumps(notification_payload)
        )
        
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Error sending recruiter notification: {str(e)}")

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        answers = event.get('answers', [])
        
        # Handle direct answer submission (no encryption)
        return handle_direct_submission(test_id, answers)
            
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }


def handle_direct_submission(test_id, answers):
    """
    Handle direct answer submission (no encryption)
    """
    try:
        # Get test data
        response = table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        
        items = response.get('Items', [])
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No test found for testID: {test_id}')
            }
        
        test_data = items[0]
        status = test_data.get('status')
        template_ID = test_data.get('templateID')
        candidate_Name = test_data.get('candidateName')
        
        if status != "In Progress":
            return {
                'statusCode': 400,
                'body': json.dumps(f'Test is not in progress. Current status: {status}')
            }
        
        # Save answers directly (no decryption needed)
        saved_answers = []
        
        for answer_data in answers:
            try:
                # Save to database
                answer_id = str(uuid.uuid4())
                mcq_answers_table.put_item(
                    Item={
                        'answerID': answer_id,
                        'testID': answer_data['testID'],
                        'questionID': answer_data['questionID'],
                        'answer': answer_data['answer'],
                        'datetime': answer_data.get('timestamp', datetime.datetime.now().isoformat())
                    }
                )
                
                saved_answers.append(answer_data)
                
            except Exception as e:
                print(f"Failed to save answer: {str(e)}")
                continue
        
        # Update test status to Completed
        table.update_item(
            Key={'testID': test_id},
            UpdateExpression='SET #status = :new_status',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={':new_status': 'Completed'}
        )

        # Get test configuration for numberOfQuestions
        config = get_test_configuration(template_ID)
        total_questions = config['numberOfQuestions']

        # Calculate score and save results
        report = calculate_score(test_id, template_ID)
        result_summary = count_submitted_and_correct_answers(report, candidate_Name, test_id, total_questions)
        save_result_to_dynamodb(test_id, report, result_summary)
        
        # Send email notification to recruiter
        test_data['status'] = 'Completed'
        send_recruiter_notification(test_data, 'Completed')

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Test submitted and score calculated successfully',
                'result_summary': result_summary,
                'saved_answers_count': len(saved_answers)
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"Error processing submission: {str(e)}")
        }