import json
import boto3
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')

def lambda_handler(event, context):
    try:
        # Get templateID from event
        template_id = event.get('templateID')
        
        if not template_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'templateID is required'})
            }
        
        # Fetch all questions for this template
        questions = []
        last_evaluated_key = None
        
        while True:
            scan_params = {
                'FilterExpression': Attr('templateID').eq(template_id)
            }
            
            if last_evaluated_key:
                scan_params['ExclusiveStartKey'] = last_evaluated_key
            
            response = questions_table.scan(**scan_params)
            questions.extend(response.get('Items', []))
            
            last_evaluated_key = response.get('LastEvaluatedKey')
            if not last_evaluated_key:
                break
        
        # Extract unique topics
        topics = set()
        for question in questions:
            topic = question.get('topic', '')
            if topic and topic != '__NO_TOPIC__':
                topics.add(topic)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'topics': list(topics),
                'questionCount': len(questions)
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
