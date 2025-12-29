import boto3
import json
import uuid
import datetime			   
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Tables
table = dynamodb.Table("testTransactions")
mcq_answers_table = dynamodb.Table('MCQAnswers')
mcq_questions_table = dynamodb.Table('MCQQuestions')

savedResult_table_name = dynamodb.Table("savedResult_table_name")

# Initialize Lambda client
lambda_client = boto3.client('lambda')

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

        response = mcq_questions_table.scan(**scan_params)

        # Append fetched items
        questions.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return questions  # Returns all records

def getAllAnswers(test_id):
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

        response = mcq_answers_table.scan(**scan_params)

        # Append fetched items
        answers.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return answers  # Returns all records

def calculate_score(test_id, template_ID):
    # Get all answers for the testID
    answers =  getAllAnswers(test_id);
    # response = mcq_answers_table.scan(FilterExpression=Attr('testID').eq(test_id))
    # answers = response.get('Items', [])

    # Get all questions for the templateID
    questions = getAllQuestions(template_ID)
    #response = mcq_questions_table.scan(FilterExpression=Attr('templateID').eq(template_ID))
    #questions = response.get('Items', [])

	# Create a dictionary for quick question lookup
    question_dict = {q['questionID']: q for q in questions}

    print(len(answers))

	# Generate the report
    report = []
    for answer in answers:
        question_id = answer['questionID']
        submitted_answer = answer['answer']

        # Find the matching question
        question = question_dict.get(question_id)
        if not question:
            report.append({
                "questionID": question_id,
                "error": "Question not found",
            })
            continue
        else:
            # Check if the answer is correct
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

def count_submitted_and_correct_answers(report, candidate_Name, test_id):
    # print(report)
    submitted_answers = sum(1 for entry in report if entry.get("submittedAnswer"))
    correct_answers = sum(1 for entry in report if entry.get("isCorrect") is True)

    if submitted_answers > 50:
        submitted_answers = 50

    if correct_answers > 50:
        correct_answers = 50

    return {
        "testID": test_id,
        "candidateName": candidate_Name,
        "totalQuestions": 50,
        "submittedAnswers": submitted_answers,
        "correctAnswers": correct_answers
    }

def save_result_to_dynamodb(test_id, report):
    # Generate a new id using UUID
    uuidkey = str(uuid.uuid4())
    
    # Prepare the item
    item = {
        'savedResultId': uuidkey,
        'report': report,
        'testID': test_id,
        'createdAt': str(datetime.datetime.now())
    }
    
    # Put the item into DynamoDB
    # check whether the testID already exists in the savedResult_table_name
    check_response = savedResult_table_name.scan(FilterExpression=Attr('testID').eq(test_id))
    # save only if the testID does not exist in the savedResult_table_name
    if not check_response.get('Items', []):
        savedResult_table_name.put_item(Item=item)
    return

def lambda_handler(event, context):
    try:
        test_id = event.get('searchTerm')
        response = table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )        
        # status = [item['status'] for item in response.get('Items', [])]
        template_ID = [item['templateID'] for item in response.get('Items', [])]

        if not template_ID:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No result found for testID: {test_id}')
            }
        
        status = [item['status'] for item in response.get('Items', [])]
        candidate_Name = [item['candidateName'] for item in response.get('Items', [])]

        if status[0]!="Completed":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test {test_id} not yet completed!')
            }

        report = calculate_score(test_id, template_ID[0])
        # save report and template_ID to the savedResult table
            
        # print(report)
        # print(template_ID[0])

        result = count_submitted_and_correct_answers(report, candidate_Name[0], test_id)

        save_result_to_dynamodb(test_id, report)
        
        return {
            'statusCode': 200,
            "body": json.dumps(result)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }            