import json
import boto3
from botocore.exceptions import ClientError
from boto3.dynamodb.conditions import Attr

def lambda_handler(event, context):
    # Initialize DynamoDB client
    dynamodb = boto3.resource('dynamodb')

    # Reference the tables
    template_table = dynamodb.Table('template')
    mcq_table = dynamodb.Table('MCQQuestions')

    # Retrieve 'templateID' from the event
    JSONData = str(event)
    body = json.loads(JSONData.replace("'",'"'))
    template_id = body["templateIDSelectedForDelete"]

    if not template_id:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "templateID is required"})
        }

    try:
        # Step 1: Get all questions for this template
        question_ids = []
        response = mcq_table.scan(
            FilterExpression=Attr('templateID').eq(template_id),
            ProjectionExpression='questionID'
        )
        for item in response.get('Items', []):
            question_ids.append(item['questionID'])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = mcq_table.scan(
                FilterExpression=Attr('templateID').eq(template_id),
                ProjectionExpression='questionID',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            for item in response.get('Items', []):
                question_ids.append(item['questionID'])

        # Step 2: Delete all questions for this template
        deleted_questions = 0
        for question_id in question_ids:
            mcq_table.delete_item(Key={'questionID': question_id})
            deleted_questions += 1

        # Step 3: Delete the template
        template_table.delete_item(Key={'templateID': template_id})

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Template with ID {template_id} deleted successfully.",
                "deletedQuestions": deleted_questions
            })
        }

    except ClientError as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }