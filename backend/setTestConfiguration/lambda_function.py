import json
import boto3
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('testConfiguration')

def lambda_handler(event, context):
    try:
        # Parse request body
        if 'body' in event:
            data = json.loads(event['body'])
        else:
            data = event

        # Support both old and new formats
        if 'd' in data and 'templateIDSelectedToAssign' in data:
            # New format
            config_id = str(data['templateIDSelectedToAssign'])
            config_data = data['d']
        elif 'testID' in data:
            # Old format
            config_id = str(data['testID'])
            config_data = {
                'allowedDefaults': data.get('allowedDefaults', 0),
                'numberOfQuestions': data.get('numberOfQuestions', 10),
                'testDuration': data.get('testDuration', 30),
                'sensitivityLevel': data.get('sensitivityLevel', 3)
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing required fields'})
            }

        # Normalize values to string for DynamoDB
        item = {
            'testConfigurationID': config_id,
            'allowedDefaults': str(config_data.get('allowedDefaults', 0)),
            'numberOfQuestions': str(config_data.get('numberOfQuestions', 10)),
            'testDuration': str(config_data.get('testDuration', 30)),
            'sensitivityLevel': str(config_data.get('sensitivityLevel', 3))
        }

        # Store in DynamoDB
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Data stored successfully'})
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
