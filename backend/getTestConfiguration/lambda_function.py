import json
import boto3
import os
from botocore.exceptions import ClientError

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('testConfiguration')

def lambda_handler(event, context):
    try:
        # Support both API Gateway style and direct invocation
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event

        test_config_id = body.get('templateID')

        if not test_config_id:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing templateID in request'})
            }

        # Query by test_config_id
        response = table.query(
            KeyConditionExpression=boto3.dynamodb.conditions.Key('testConfigurationID').eq(test_config_id)
        )

        # Add default values for fields if not present
        configurations = response.get('Items', [])
        for config in configurations:
            if 'numberOfQuestions' not in config:
                config['numberOfQuestions'] = '50'
            if 'testDuration' not in config:
                config['testDuration'] = '60'
            if 'sensitivityLevel' not in config:
                config['sensitivityLevel'] = '5'
            if 'allowedDefaults' not in config:
                config['allowedDefaults'] = '10'

        return {
            'statusCode': 200,
            'body': json.dumps({
                'testConfigurationID': test_config_id,
                'configurations': configurations
            })
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e.response['Error']['Message'])})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
