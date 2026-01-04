import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
config_table = dynamodb.Table('testConfiguration')
test_table = dynamodb.Table('testTransactions')

# CORS headers
CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
}

def lambda_handler(event, context):
    try:
        # Support both API Gateway style and direct invocation
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event

        # Get templateID - either directly or by looking up from testID/userUniqueID
        template_id = body.get('templateID')
        user_unique_id = body.get('userUniqueID')

        # If userUniqueID (test ID) is provided, look up the templateID from testTransactions
        if not template_id and user_unique_id:
            test_response = test_table.scan(
                FilterExpression=Attr('testID').eq(user_unique_id)
            )
            test_items = test_response.get('Items', [])
            if test_items:
                template_id = test_items[0].get('templateID')

        if not template_id:
            # Return default configuration if no templateID found
            return {
                'statusCode': 200,
                'headers': CORS_HEADERS,
                'body': json.dumps({
                    'testConfigurationID': None,
                    'configurations': [{
                        'numberOfQuestions': '50',
                        'testDuration': '60',
                        'sensitivityLevel': '5',
                        'allowedDefaults': '10'
                    }]
                })
            }

        # Query by templateID (testConfigurationID is the partition key)
        response = config_table.query(
            KeyConditionExpression=Key('testConfigurationID').eq(template_id)
        )

        # Add default values for fields if not present
        configurations = response.get('Items', [])
        
        # If no configuration found, return defaults
        if not configurations:
            configurations = [{
                'numberOfQuestions': '50',
                'testDuration': '60',
                'sensitivityLevel': '5',
                'allowedDefaults': '10'
            }]
        else:
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
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'testConfigurationID': template_id,
                'configurations': configurations
            })
        }

    except ClientError as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e.response['Error']['Message'])})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': CORS_HEADERS,
            'body': json.dumps({'error': str(e)})
        }
