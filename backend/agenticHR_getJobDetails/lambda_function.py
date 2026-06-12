# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from decimal import Decimal
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
candidates_table = dynamodb.Table('AgenticHR_Candidates')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    """
    Get detailed information about a job including all candidates and top 25
    """
    try:
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        email = body.get('email')
        job_id = body.get('jobId')
        
        if not email or not job_id:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Email and jobId are required'
                })
            }
        
        # Get job details
        job_response = jobs_table.get_item(Key={'jobId': job_id})
        job = job_response.get('Item')
        
        if not job:
            return {
                'statusCode': 404,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Job not found'
                })
            }
        
        # Verify job belongs to user
        if job.get('email') != email:
            return {
                'statusCode': 403,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Unauthorized access to job'
                })
            }
        
        # Get all candidates for this job
        response = candidates_table.query(
            IndexName='jobId-index',
            KeyConditionExpression=Key('jobId').eq(job_id)
        )
        
        all_candidates = response.get('Items', [])
        
        # Sort by match score and get top 25
        sorted_candidates = sorted(
            all_candidates,
            key=lambda x: (
                float(x.get('testScore', 0)) if x.get('testScore') else 0,
                float(x.get('matchScore', 0))
            ),
            reverse=True
        )
        
        top_25_candidates = sorted_candidates[:25]
        
        # Format candidates for response
        formatted_candidates = []
        for candidate in all_candidates:
            formatted_candidates.append({
                'candidateId': candidate.get('candidateId'),
                'name': candidate.get('name'),
                'email': candidate.get('candidateEmail'),
                'matchScore': float(candidate.get('matchScore', 0)),
                'testStatus': candidate.get('testStatus', 'pending'),
                'testScore': float(candidate.get('testScore')) if candidate.get('testScore') else None,
                'source': candidate.get('source'),
                'profileUrl': candidate.get('profileUrl')
            })
        
        formatted_top_25 = []
        for candidate in top_25_candidates:
            formatted_top_25.append({
                'candidateId': candidate.get('candidateId'),
                'name': candidate.get('name'),
                'email': candidate.get('candidateEmail'),
                'matchScore': float(candidate.get('matchScore', 0)),
                'testStatus': candidate.get('testStatus', 'pending'),
                'testScore': float(candidate.get('testScore')) if candidate.get('testScore') else None,
                'source': candidate.get('source'),
                'profileUrl': candidate.get('profileUrl'),
                'strengths': candidate.get('strengths', []),
                'gaps': candidate.get('gaps', [])
            })
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'job': {
                    'jobId': job.get('jobId'),
                    'jobTitle': job.get('jobTitle'),
                    'status': job.get('status'),
                    'candidatesCount': int(job.get('candidatesCount', 0)),
                    'testsCompleted': int(job.get('testsCompleted', 0)),
                    'invitedCount': int(job.get('invitedCount', 0)),
                    'remindedCount': int(job.get('remindedCount', 0))
                },
                'candidates': formatted_candidates,
                'topCandidates': formatted_top_25
            }, cls=DecimalEncoder)
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
