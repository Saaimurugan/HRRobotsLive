# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import uuid
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
tests_table = dynamodb.Table('AgenticHR_Tests')
sqs = boto3.client('sqs')
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue'

def generate_test_with_ai(job_description):
    """
    Generate test questions using AI based on JD
    """
    try:
        LITE_MODEL_ID = "amazon.nova-lite-v1:0"
        
        message_list = [
            {"role": "user", "content": [{
                "text": f"""
                Generate 10 multiple choice questions to assess candidates for this job:
                
                {job_description}
                
                Return JSON array of questions:
                [
                    {{
                        "question": "question text",
                        "options": ["A", "B", "C", "D"],
                        "correctAnswer": "A"
                    }}
                ]
                """
            }]}
        ]
        
        system_list = [{"text": "You are an expert at creating technical assessment questions."}]
        inf_params = {"max_new_tokens": 2000, "top_p": 0.9, "temperature": 0.7}
        
        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }
        
        response = bedrock.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID,
            body=json.dumps(request_body)
        )
        
        stream = response.get("body")
        response_data = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta
        
        # Clean markdown
        cleaned = response_data.strip()
        if cleaned.startswith("```json"):
            cleaned = cleaned[7:]
        if cleaned.startswith("```"):
            cleaned = cleaned[3:]
        if cleaned.endswith("```"):
            cleaned = cleaned[:-3]
        
        return json.loads(cleaned.strip())
        
    except Exception as e:
        print(f"Error generating test: {str(e)}")
        return []

def lambda_handler(event, context):
    """
    Generate tests for a job
    """
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            job_id = message['jobId']
            email = message['email']
            job_description = message['jobDescription']
            
            print(f"Generating test for job: {job_id}")
            
            # Generate test questions
            questions = generate_test_with_ai(job_description)
            
            if questions:
                test_id = str(uuid.uuid4())
                test_item = {
                    'testId': test_id,
                    'jobId': job_id,
                    'email': email,
                    'questions': questions,
                    'createdAt': datetime.utcnow().isoformat()
                }
                tests_table.put_item(Item=test_item)
                
                # Update job with test ID
                jobs_table.update_item(
                    Key={'jobId': job_id},
                    UpdateExpression='SET testId = :testId, #status = :status, updatedAt = :updated',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':testId': test_id,
                        ':status': 'inviting',
                        ':updated': datetime.utcnow().isoformat()
                    }
                )
                
                # Trigger invite sending
                invite_message = {
                    'jobId': job_id,
                    'email': email,
                    'testId': test_id,
                    'action': 'send_invites'
                }
                sqs.send_message(
                    QueueUrl=QUEUE_URL,
                    MessageBody=json.dumps(invite_message)
                )
                
                print(f"Test generated for job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Test generation completed'})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
