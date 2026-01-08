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

    # Ensure total_questions is always the configured value, not the report length
    # print(f"DEBUG: Using total_questions={total_questions} for test {test_id}")
    # print(f"DEBUG: Report contains {len(report)} answered questions")
    # print(f"DEBUG: Submitted answers: {submitted_answers}, Correct answers: {correct_answers}")

    return {
        "testID": test_id,
        "candidateName": candidate_Name,
        "totalQuestions": total_questions,  # Always use the configured value
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
    """
    Send email notification to recruiter after test submission/termination.
    Does not include photos or results, only test details.
    """
    try:
        recruiter_email = test_data.get('email')
        candidate_name = test_data.get('candidateName', 'Unknown')
        test_id = test_data.get('testID')
        template_id = test_data.get('templateID')
        test_datetime = test_data.get('datetime', 'N/A')
        termination_reason = test_data.get('terminationReason', '')
        
        if not recruiter_email:
            return
        
        # Get template name
        template_name = get_template_name(template_id)
        
        # Determine status and subject
        if status_type == 'Completed':
            subject = f"Test Completed - {candidate_name}"
            status_text = "completed"
            status_color = "#28a745"
        else:
            subject = f"Test Terminated - {candidate_name}"
            status_text = "terminated"
            status_color = "#dc3545"
        
        # Build email body (HTML)
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; }}
                .content {{ background: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px; }}
                .status-badge {{ display: inline-block; padding: 8px 16px; border-radius: 20px; color: white; font-weight: bold; background-color: {status_color}; }}
                .detail-row {{ padding: 10px 0; border-bottom: 1px solid #eee; }}
                .detail-label {{ font-weight: bold; color: #666; }}
                .detail-value {{ color: #333; }}
                .footer {{ text-align: center; padding: 20px; color: #888; font-size: 12px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Test Notification</h1>
                    <p>A candidate has {status_text} their test</p>
                </div>
                <div class="content">
                    <p style="text-align: center; margin-bottom: 20px;">
                        <span class="status-badge">Test {status_type}</span>
                    </p>
                    
                    <div class="detail-row">
                        <span class="detail-label">Candidate Name:</span>
                        <span class="detail-value">{candidate_name}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Test ID:</span>
                        <span class="detail-value">{test_id}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Template:</span>
                        <span class="detail-value">{template_name}</span>
                    </div>
                    
                    <div class="detail-row">
                        <span class="detail-label">Date/Time:</span>
                        <span class="detail-value">{test_datetime}</span>
                    </div>
                    
                    {"<div class='detail-row'><span class='detail-label'>Termination Reason:</span><span class='detail-value'>" + termination_reason + "</span></div>" if termination_reason and status_type == 'Terminated' else ""}
                    
                    <p style="margin-top: 20px; text-align: center;">
                        <a href="https://hrrobots.com" style="display: inline-block; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 25px;">View Results on HRRobots</a>
                    </p>
                </div>
                <div class="footer">
                    <p>This is an automated notification from HRRobots.</p>
                    <p>&copy; {datetime.datetime.now().year} HRRobots. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        # Invoke the sendEmailSMTP Lambda
        lambda_client.invoke(
            FunctionName='sendEmailSMTP',
            InvocationType='Event',  # Async invocation
            Payload=json.dumps({
                'recipient_email': recruiter_email,
                'subject': subject,
                'body': body
            })
        )
    except Exception as e:
        # Log error but don't fail the main operation
        print(f"Error sending recruiter notification: {str(e)}")

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
        
        test_data = items[0]
        status = test_data.get('status')
        template_ID = test_data.get('templateID')
        candidate_Name = test_data.get('candidateName')
        
        # Get test configuration for numberOfQuestions
        config = get_test_configuration(template_ID)
        total_questions = config['numberOfQuestions']
        
        # print(f"DEBUG: Template ID: {template_ID}")
        # print(f"DEBUG: Configuration retrieved: {config}")
        # print(f"DEBUG: Total questions from config: {total_questions}")
            
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
            
            # Send email notification to recruiter
            test_data['status'] = 'Completed'
            send_recruiter_notification(test_data, 'Completed')

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
            
            # Send email notification to recruiter (for terminated tests)
            if status == "Terminated":
                send_recruiter_notification(test_data, 'Terminated')

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