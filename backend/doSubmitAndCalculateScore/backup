import boto3
import json
import uuid
import datetime			   
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Tables
table = dynamodb.Table("testTransactions")
mcq_answers_table = dynamodb.Table('MCQAnswers')
mcq_questions_table = dynamodb.Table('MCQQuestions')

# Initialize Lambda client
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        response = table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        status = [item['status'] for item in response.get('Items', [])]
        template_ID = [item['templateID'] for item in response.get('Items', [])]

        if not status:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No test found for testID: {test_id}')
            }
            
        if status[0]=="In Progress":
            status = "Completed"
            table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status',
                ExpressionAttributeNames={'#status': 'status'},
                ExpressionAttributeValues={':new_status': status}
            )

            return {
                'statusCode': 200,
                'body': json.dumps({
                'message': 'Answers saved successfully'
            })
            }
        else:
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test status for testID {test_id} is {status}.')
            }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }            