import boto3
import json
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table("testTransactions")
savedResult_table = dynamodb.Table("savedResult_table_name")
mcq_questions_table = dynamodb.Table('MCQQuestions')
mcq_answers_table = dynamodb.Table('MCQAnswers')

def get_all_questions(template_id):
    """Fetch all questions for a template"""
    questions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_id)
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = mcq_questions_table.scan(**scan_params)
        questions.extend(response.get('Items', []))
        last_evaluated_key = response.get('LastEvaluatedKey')
        
        if not last_evaluated_key:
            break
    
    return questions

def get_all_answers(test_id):
    """Fetch all answers for a test"""
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

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        
        if not test_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Missing required parameter: testID'})
            }
        
        # Get test transaction to find template ID and verify test is completed
        items = []
        try:
            response = table.query(
                IndexName="testID-index",
                KeyConditionExpression=Key('testID').eq(test_id)
            )
            items = response.get('Items', [])
        except Exception:
            response = table.scan(FilterExpression=Attr('testID').eq(test_id))
            items = response.get('Items', [])
        
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': f'No test found for testID: {test_id}'})
            }
        
        test_data = items[0]
        status = test_data.get('status')
        template_id = test_data.get('templateID')
        
        if status not in ["Completed", "Terminated"]:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Test is not yet completed'})
            }
        
        # Get all questions for the template
        questions = get_all_questions(template_id)
        question_dict = {q['questionID']: q for q in questions}
        
        # Get all answers submitted by the candidate
        answers = get_all_answers(test_id)
        answer_dict = {a['questionID']: a.get('answer', '') for a in answers}
        
        # Build the question review data - only include questions that were part of this test
        # (i.e., questions that have an answer record, even if the answer is empty)
        review_questions = []
        for answer in answers:
            question_id = answer['questionID']
            question = question_dict.get(question_id)
            
            if not question:
                continue
            
            submitted_answer = answer.get('answer', '')
            correct_answer = question.get('correctAnswer', '')
            
            # Handle both old format (option1, option2, etc.) and new format (options array)
            options = []
            if 'options' in question and isinstance(question['options'], list):
                # New format: options is an array
                options = question['options']
            elif 'options' in question and question['options'] == 'Range':
                # Range type question
                options = []
            elif 'options' in question and question['options'] == 'RangeWithTwoQuestions':
                # Range with two questions type
                options = []
            else:
                # Old format: option1, option2, option3, option4
                for key in ['option1', 'option2', 'option3', 'option4']:
                    if key in question and question[key]:
                        options.append(question[key])
            
            review_questions.append({
                'questionID': question_id,
                'question': question.get('question', ''),
                'topic': question.get('topic', ''),
                'type': question.get('type', 'mcq'),
                'options': options,
                'correctAnswer': correct_answer,
                'submittedAnswer': submitted_answer,
                'isCorrect': submitted_answer == correct_answer and submitted_answer != '' and correct_answer != ''
            })
        
        # Sort by question order if available, otherwise by questionID
        review_questions.sort(key=lambda x: x.get('questionID', ''))
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'testID': test_id,
                'templateID': template_id,
                'questions': review_questions,
                'totalQuestions': len(review_questions),
                'correctCount': sum(1 for q in review_questions if q['isCorrect']),
                'incorrectCount': sum(1 for q in review_questions if not q['isCorrect'] and q['submittedAnswer']),
                'unansweredCount': sum(1 for q in review_questions if not q['submittedAnswer'])
            }, cls=DecimalEncoder)
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'An error occurred: {str(e)}'})
        }
