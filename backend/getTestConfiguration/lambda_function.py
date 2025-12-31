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
        # Support both API Gateway and direct payload invocation
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

        return {
            'statusCode': 200,
            'body': json.dumps({
                'testConfigurationID': test_config_id,
                'configurations': response.get('Items', [])
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
