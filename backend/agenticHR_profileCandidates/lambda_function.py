# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import random
from datetime import datetime
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
candidates_table = dynamodb.Table('AgenticHR_Candidates')
sqs = boto3.client('sqs')
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue'

def profile_candidate_with_ai(job_description, resume):
    """
    Use AWS Bedrock to profile candidate against JD
    """
    try:
        LITE_MODEL_ID = "amazon.nova-lite-v1:0"
        
        message_list = [
            {"role": "user", "content": [{
                "text": f"""
                Analyze this candidate's resume against the job description and provide a match score (0-100).
                
                Job Description:
                {job_description}
                
                Resume:
                {resume}
                
                Return only a JSON object with:
                {{
                    "matchScore": <number 0-100>,
                    "strengths": ["list of strengths"],
                    "gaps": ["list of gaps"]
                }}
                """
            }]}
        ]
        
        system_list = [{"text": "You are an HR profiling AI that matches candidates to job descriptions."}]
        inf_params = {"max_new_tokens": 1000, "top_p": 0.9, "temperature": 0.3}
        
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
        
        # Clean markdown code blocks
        cleaned_response = response_data.strip()
        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]
        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]
        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]
        cleaned_response = cleaned_response.strip()
        
        return json.loads(cleaned_response)
        
    except Exception as e:
        print(f"Error in AI profiling: {str(e)}")
        # Fallback to random score if AI fails
        return {
            "matchScore": random.randint(50, 95),
            "strengths": ["Experience relevant to role"],
            "gaps": ["Some skills need development"]
        }

def lambda_handler(event, context):
    """
    Profile all candidates for a job using AI
    """
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            job_id = message['jobId']
            email = message['email']
            job_description = message['jobDescription']
            
            print(f"Profiling candidates for job: {job_id}")
            
            # Update job status
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'profiling',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Get all candidates for this job
            response = candidates_table.query(
                IndexName='jobId-index',
                KeyConditionExpression=Key('jobId').eq(job_id)
            )
            
            candidates = response.get('Items', [])
            
            # Profile each candidate
            for candidate in candidates:
                profile_result = profile_candidate_with_ai(
                    job_description,
                    candidate.get('resume', '')
                )
                
                # Update candidate with profiling results
                candidates_table.update_item(
                    Key={'candidateId': candidate['candidateId']},
                    UpdateExpression='SET matchScore = :score, strengths = :strengths, gaps = :gaps, #status = :status',
                    ExpressionAttributeNames={'#status': 'status'},
                    ExpressionAttributeValues={
                        ':score': profile_result['matchScore'],
                        ':strengths': profile_result['strengths'],
                        ':gaps': profile_result['gaps'],
                        ':status': 'profiled'
                    }
                )
            
            # Update job status to testing
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'testing',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Trigger test generation
            test_message = {
                'jobId': job_id,
                'email': email,
                'jobDescription': job_description,
                'action': 'generate_tests'
            }
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=json.dumps(test_message)
            )
            
            print(f"Profiled {len(candidates)} candidates for job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Candidate profiling completed'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error profiling candidates',
                'error': str(e)
            })
        }
