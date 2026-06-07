# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import json
import boto3
import uuid
from datetime import datetime
from boto3.dynamodb.conditions import Key

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
template_table = dynamodb.Table('template')
questions_table = dynamodb.Table('MCQQuestions')
config_table = dynamodb.Table('testConfiguration')

def lambda_handler(event, context):
    try:
        # Parse request body
        if 'body' in event:
            data = json.loads(event['body'])
        else:
            data = event

        template_id = data.get('templateID')
        new_template_name = data.get('newTemplateName')
        user_email = data.get('email')  # Email of the user cloning the template
        
        if not template_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing templateID in the request.'})
            }
        
        if not user_email:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing email in the request.'})
            }

        # Fetch the original template
        template_response = template_table.query(
            KeyConditionExpression=Key('templateID').eq(template_id)
        )
        
        if not template_response.get('Items'):
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'Template not found.'})
            }
        
        original_template = template_response['Items'][0]
        
        # Generate new template ID
        new_template_id = str(uuid.uuid4())
        
        # Create new template with same properties but assign to the cloning user
        new_template = {
            'templateID': new_template_id,
            'templateName': new_template_name or f"{original_template.get('templateName', 'Template')} - Copy",
            'email': user_email,  # Assign to the user who is cloning
            'datetime': datetime.now().isoformat()
        }
        
        # Save new template
        template_table.put_item(Item=new_template)
        
        # Clone all questions from original template
        questions_response = questions_table.scan(
            FilterExpression=Key('templateID').eq(template_id)
        )
        
        original_questions = questions_response.get('Items', [])
        
        # Copy questions to new template
        for question in original_questions:
            new_question = {
                'questionID': str(uuid.uuid4()),
                'templateID': new_template_id,
                'type': question.get('type', 'mcq'),
                'topic': question.get('topic', ''),
                'question': question.get('question', ''),
                'options': question.get('options', []),
                'correctAnswer': question.get('correctAnswer', ''),
                'correctAnswerIndex': question.get('correctAnswerIndex', -1)
            }
            questions_table.put_item(Item=new_question)
        
        # Clone test configuration
        config_response = config_table.query(
            KeyConditionExpression=Key('testConfigurationID').eq(template_id)
        )
        
        if config_response.get('Items'):
            original_config = config_response['Items'][0]
            new_config = {
                'testConfigurationID': new_template_id,
                'allowedDefaults': original_config.get('allowedDefaults', '10'),
                'numberOfQuestions': original_config.get('numberOfQuestions', '10'),
                'testDuration': original_config.get('testDuration', '60'),
                'sensitivityLevel': original_config.get('sensitivityLevel', '5')
            }
            config_table.put_item(Item=new_config)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Template cloned successfully',
                'newTemplateID': new_template_id,
                'questionCount': len(original_questions)
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
