#not in use

import boto3
import json
import os
from botocore.exceptions import NoCredentialsError

def lambda_handler(event, context):
    # AWS S3 bucket details
    S3_BUCKET = "hrrfiles"
    S3_REGION = "us-east-1"

    # Parse incoming event
    try:
        JSONData = str(event)
        body = json.loads(JSONData.replace("'",'"'))
        user_id = body['userID']
        report = body['report']

        if not report:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Invalid input format'})
            }
    except (KeyError, json.JSONDecodeError):
        return {
            'statusCode': 400,
            'body': json.dumps({'message': 'Invalid input format'})
        }

    # Generate file content
    file_content = f"User ID: {user_id}\nTotal Questions: {report['totalQuestions']}\nAttempted Questions: {report['attemptedQuestions']}\nCorrect Answers: {report['correctAnswers']}"

    # Define file path for S3
    file_key = f"files/{user_id}.txt"

    # Save file to S3
    s3_client = boto3.client('s3', region_name=S3_REGION)

    try:
        s3_client.put_object(Bucket=S3_BUCKET, Key=file_key, Body=file_content)
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Answers saved successfully'
            })
        }
    except NoCredentialsError:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': 'AWS credentials not configured'})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'message': f'Failed to save answers: {str(e)}'})
        }
