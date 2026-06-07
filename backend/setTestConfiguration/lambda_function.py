import json
import boto3
from botocore.exceptions import ClientError

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('testConfiguration')

# Default configuration values
DEFAULT_CONFIG = {
    'allowedDefaults': '10',      # Face detection warnings allowed
    'numberOfQuestions': '10',    # Number of questions in test
    'testDuration': '60',         # Test duration in minutes
    'sensitivityLevel': '5'       # Seconds before face-off warning
}

def lambda_handler(event, context):
    try:
        # Parse request body
        if 'body' in event:
            data = json.loads(event['body'])
        else:
            data = event

        # Support multiple formats:
        # 1. New format with 'd' and 'templateIDSelectedToAssign'
        # 2. Old format with 'templateID'
        # 3. Create default format with 'templateID' and 'createDefault': true
        
        if data.get('createDefault') and data.get('templateID'):
            # Create default configuration for new template
            config_id = str(data['templateID'])
            item = {
                'testConfigurationID': config_id,
                'allowedDefaults': DEFAULT_CONFIG['allowedDefaults'],
                'numberOfQuestions': DEFAULT_CONFIG['numberOfQuestions'],
                'testDuration': DEFAULT_CONFIG['testDuration'],
                'sensitivityLevel': DEFAULT_CONFIG['sensitivityLevel']
            }
        elif 'd' in data and 'templateIDSelectedToAssign' in data:
            # New format
            config_id = str(data['templateIDSelectedToAssign'])
            config_data = data['d']
            item = {
                'testConfigurationID': config_id,
                'allowedDefaults': str(config_data.get('allowedDefaults', DEFAULT_CONFIG['allowedDefaults'])),
                'numberOfQuestions': str(config_data.get('numberOfQuestions', DEFAULT_CONFIG['numberOfQuestions'])),
                'testDuration': str(config_data.get('testDuration', DEFAULT_CONFIG['testDuration'])),
                'sensitivityLevel': str(config_data.get('sensitivityLevel', DEFAULT_CONFIG['sensitivityLevel']))
            }
        elif 'templateID' in data:
            # Direct templateID format
            config_id = str(data['templateID'])
            item = {
                'testConfigurationID': config_id,
                'allowedDefaults': str(data.get('allowedDefaults', DEFAULT_CONFIG['allowedDefaults'])),
                'numberOfQuestions': str(data.get('numberOfQuestions', DEFAULT_CONFIG['numberOfQuestions'])),
                'testDuration': str(data.get('testDuration', DEFAULT_CONFIG['testDuration'])),
                'sensitivityLevel': str(data.get('sensitivityLevel', DEFAULT_CONFIG['sensitivityLevel']))
            }
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing required fields. Provide templateID.'})
            }

        # Store in DynamoDB
        table.put_item(Item=item)

        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Configuration saved successfully', 'config': item})
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
