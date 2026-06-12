# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import uuid
from datetime import datetime
import requests
from bs4 import BeautifulSoup

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
candidates_table = dynamodb.Table('AgenticHR_Candidates')
sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue'

def search_linkedin(job_title, job_description):
    """
    Simulate LinkedIn profile search
    In production, use LinkedIn API or scraping service
    """
    # This is a placeholder - implement actual LinkedIn scraping/API
    profiles = []
    # Mock profiles for demonstration
    for i in range(10):
        profiles.append({
            'name': f'Candidate {i+1}',
            'email': f'candidate{i+1}@example.com',
            'profileUrl': f'https://linkedin.com/in/candidate{i+1}',
            'source': 'LinkedIn',
            'resume': f'Professional with experience in {job_title}'
        })
    return profiles

def search_naukri(job_title, job_description):
    """
    Simulate Naukri profile search
    In production, use Naukri API or scraping service
    """
    profiles = []
    for i in range(8):
        profiles.append({
            'name': f'Naukri Candidate {i+1}',
            'email': f'naukri{i+1}@example.com',
            'profileUrl': f'https://naukri.com/profile/candidate{i+1}',
            'source': 'Naukri',
            'resume': f'Skilled professional in {job_title}'
        })
    return profiles

def search_monster(job_title, job_description):
    """
    Simulate Monster profile search
    In production, use Monster API or scraping service
    """
    profiles = []
    for i in range(7):
        profiles.append({
            'name': f'Monster Candidate {i+1}',
            'email': f'monster{i+1}@example.com',
            'profileUrl': f'https://monster.com/profile/candidate{i+1}',
            'source': 'Monster',
            'resume': f'Experienced {job_title} professional'
        })
    return profiles

def lambda_handler(event, context):
    """
    Collect profiles from various job portals
    This Lambda is triggered by SQS queue
    """
    try:
        # Parse SQS message
        for record in event['Records']:
            message = json.loads(record['body'])
            job_id = message['jobId']
            email = message['email']
            job_title = message['jobTitle']
            job_description = message['jobDescription']
            
            print(f"Collecting profiles for job: {job_id}")
            
            # Update job status
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'collecting',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Collect profiles from different sources
            all_profiles = []
            all_profiles.extend(search_linkedin(job_title, job_description))
            all_profiles.extend(search_naukri(job_title, job_description))
            all_profiles.extend(search_monster(job_title, job_description))
            
            # Store candidates in DynamoDB
            candidate_count = 0
            for profile in all_profiles:
                candidate_id = str(uuid.uuid4())
                candidate_item = {
                    'candidateId': candidate_id,
                    'jobId': job_id,
                    'email': email,
                    'name': profile['name'],
                    'candidateEmail': profile['email'],
                    'profileUrl': profile['profileUrl'],
                    'source': profile['source'],
                    'resume': profile['resume'],
                    'status': 'collected',
                    'createdAt': datetime.utcnow().isoformat()
                }
                candidates_table.put_item(Item=candidate_item)
                candidate_count += 1
            
            # Update job with candidate count
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET candidatesCount = :count, #status = :status, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':count': candidate_count,
                    ':status': 'profiling',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Trigger profiling step
            profile_message = {
                'jobId': job_id,
                'email': email,
                'jobDescription': job_description,
                'action': 'start_profiling'
            }
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=json.dumps(profile_message)
            )
            
            print(f"Collected {candidate_count} profiles for job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Profile collection completed'
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error collecting profiles',
                'error': str(e)
            })
        }
