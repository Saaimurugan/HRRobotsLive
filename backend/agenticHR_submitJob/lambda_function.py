# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import uuid
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('AgenticHR_Jobs')
sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue'

def lambda_handler(event, context):
    """
    Submit a new job for Agentic HR process
    """
    try:
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        email = body.get('email')
        job_title = body.get('jobTitle')
        job_description = body.get('jobDescription')
        token = body.get('token')
        
        if not email or not job_title or not job_description:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Missing required fields: email, jobTitle, jobDescription'
                })
            }
        
        # Generate unique job ID
        job_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().isoformat()
        
        # Store job in DynamoDB
        item = {
            'jobId': job_id,
            'email': email,
            'jobTitle': job_title,
            'jobDescription': job_description,
            'status': 'collecting',
            'createdAt': timestamp,
            'updatedAt': timestamp,
            'candidatesCount': 0,
            'testsCompleted': 0
        }
        
        table.put_item(Item=item)
        
        # Send message to SQS queue to start the agentic process
        message = {
            'jobId': job_id,
            'email': email,
            'jobTitle': job_title,
            'jobDescription': job_description,
            'action': 'start_collection'
        }
        
        sqs.send_message(
            QueueUrl=QUEUE_URL,
            MessageBody=json.dumps(message)
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Job submitted successfully',
                'jobId': job_id
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
