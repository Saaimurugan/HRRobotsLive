# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from datetime import datetime
from boto3.dynamodb.conditions import Key, Attr

dynamodb = boto3.resource('dynamodb')
jobs_table = dynamodb.Table('AgenticHR_Jobs')
candidates_table = dynamodb.Table('AgenticHR_Candidates')
ses = boto3.client('ses', region_name='us-east-1')

def send_followup_email(candidate_email, candidate_name, job_title, test_link):
    """
    Send follow-up reminder email using AWS SES
    """
    try:
        subject = f"Reminder: Complete Your Assessment for {job_title}"
        body_html = f"""
        <html>
        <head></head>
        <body>
            <h2>Hello {candidate_name},</h2>
            <p>This is a friendly reminder about the assessment for the <strong>{job_title}</strong> position.</p>
            <p>We noticed that you haven't completed the assessment yet. We would love to see what you can do!</p>
            <p><a href="{test_link}" style="background-color: #FF9800; color: white; padding: 14px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px;">Complete Assessment Now</a></p>
            <p>The assessment takes approximately 30 minutes. Please complete it at your earliest convenience.</p>
            <p>If you have any questions, feel free to reply to this email.</p>
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
        print(f"Error sending follow-up to {candidate_email}: {str(e)}")
        return False

def lambda_handler(event, context):
    """
    Send follow-up reminders to candidates who haven't completed the test
    """
    try:
        for record in event['Records']:
            message = json.loads(record['body'])
            job_id = message['jobId']
            email = message['email']
            test_id = message['testId']
            
            print(f"Sending follow-ups for job: {job_id}")
            
            # Get job details
            job_response = jobs_table.get_item(Key={'jobId': job_id})
            job = job_response.get('Item', {})
            job_title = job.get('jobTitle', 'Position')
            
            # Get candidates who were invited but haven't completed the test
            response = candidates_table.query(
                IndexName='jobId-index',
                KeyConditionExpression=Key('jobId').eq(job_id),
                FilterExpression=Attr('testStatus').eq('invited')
            )
            
            candidates = response.get('Items', [])
            reminded_count = 0
            
            # Send follow-up emails
            for candidate in candidates:
                success = send_followup_email(
                    candidate['candidateEmail'],
                    candidate['name'],
                    job_title,
                    candidate.get('testLink', '')
                )
                
                if success:
                    # Update candidate status
                    candidates_table.update_item(
                        Key={'candidateId': candidate['candidateId']},
                        UpdateExpression='SET testStatus = :status, remindedAt = :reminded',
                        ExpressionAttributeValues={
                            ':status': 'reminded',
                            ':reminded': datetime.utcnow().isoformat()
                        }
                    )
                    reminded_count += 1
            
            # Update job status
            jobs_table.update_item(
                Key={'jobId': job_id},
                UpdateExpression='SET #status = :status, remindedCount = :count, updatedAt = :updated',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={
                    ':status': 'completed',
                    ':count': reminded_count,
                    ':updated': datetime.utcnow().isoformat()
                }
            )
            
            print(f"Sent {reminded_count} follow-ups for job: {job_id}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Follow-ups sent successfully'})
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
