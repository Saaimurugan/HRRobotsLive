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
        elif all(k in data for k in ['testID', 'faceRecognition', 'toleranceLevel', 'allowedDefaults']):
            # Old format
            config_id = str(data['testID'])
            config_data = {
                'faceRecognition': data['faceRecognition'],
                'toleranceLevel': data['toleranceLevel'],
                'allowedDefaults': data['allowedDefaults']
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing required fields'})
            }

        # Normalize values to string for DynamoDB (if needed)
        item = {
            'testConfigurationID': config_id,
            'faceRecognition': str(config_data['faceRecognition']),
            'toleranceLevel': str(config_data['toleranceLevel']),
            'allowedDefaults': str(config_data['allowedDefaults'])
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
