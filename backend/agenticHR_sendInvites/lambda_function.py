# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from datetime import datetime
from boto3.dynamodb.conditions import Key

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
candidates_table = dynamodb.Table('AgenticHR_Candidates')
ses = boto3.client('ses', region_name='us-east-1')
sqs = boto3.client('sqs')
QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/YOUR_ACCOUNT/AgenticHR-Queue'

def send_test_invite(candidate_email, candidate_name, job_title, test_link):
    """
    Send test invitation email using AWS SES
    """
    try:
        subject = f"Assessment Invitation: {job_title}"
        body_html = f"""
        <html>
        <head></head>
        <body>
            <h2>Hello {candidate_name},</h2>
            <p>We are excited to invite you to take an assessment for the <strong>{job_title}</strong> position.</p>
            <p>Your profile has been matched with our requirements, and we would like to learn more about your skills.</p>
            <p><a href="{test_link}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Take Assessment</a></p>
            <p>The assessment should take approximately 30 minutes to complete.</p>
            <p>Best regards,<br/>HR Team</p>
        </body>
        </html>
        """
        
        response = ses.send_email(
            Source='noreply@hrrobots.click',
            Destination={'ToAddresses': [candidate_email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': body_html}}
            }
        )
        
        return True
    except Exception as e:
        print(f"Error sending email to {candidate_email}: {str(e)}")
        return False

def lambda_handler(event, context):
    """
    Send test invitations to all profiled candidates
    """
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            job_id = message['jobId']
            email = message['email']
            test_id = message['testId']
            
            print(f"Sending invites for job: {job_id}")
            
            # Update job status
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'inviting',
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Get job details
            job_response = jobs_table.get_item(Key={'jobId': job_id})
            job = job_response.get('Item', {})
            job_title = job.get('jobTitle', 'Position')
            
            # Get all profiled candidates
            response = candidates_table.query(
                IndexName='jobId-index',
                KeyConditionExpression=Key('jobId').eq(job_id),
                FilterExpression='#status = :status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':status': 'profiled'}
            )
            
            candidates = response.get('Items', [])
            invited_count = 0
            
            # Send invites to candidates
            for candidate in candidates:
                test_link = f"https://www.hrrobots.click/test?testId={test_id}&candidateId={candidate['candidateId']}"
                
                success = send_test_invite(
                    candidate['candidateEmail'],
                    candidate['name'],
                    job_title,
                    test_link
                )
                
                if success:
                    # Update candidate status
                    candidates_table.update_item(
                        Key={'candidateId': candidate['candidateId']},
                        UpdateExpression='SET testStatus = :status, testLink = :link, invitedAt = :invited',
                        ExpressionAttributeValues={
                            ':status': 'invited',
                            ':link': test_link,
                            ':invited': datetime.utcnow().isoformat()
                        }
                    )
                    invited_count += 1
            
            # Update job status to following_up
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, invitedCount = :count, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'following_up',
                    ':count': invited_count,
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            # Schedule follow-up (trigger after 48 hours)
            followup_message = {
                'jobId': job_id,
                'email': email,
                'testId': test_id,
                'action': 'send_followups'
            }
            sqs.send_message(
                QueueUrl=QUEUE_URL,
                MessageBody=json.dumps(followup_message),
                DelaySeconds=172800  # 48 hours delay
            )
            
            print(f"Sent {invited_count} invites for job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Invites sent successfully'})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
