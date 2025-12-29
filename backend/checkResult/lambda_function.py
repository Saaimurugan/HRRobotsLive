import boto3
import json
from decimal import Decimal
from boto3.dynamodb.conditions import Attr

# Custom JSON encoder to handle Decimal types from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

# Tables
table = dynamodb.Table("testTransactions")
savedResult_table = dynamodb.Table("savedResult_table_name")

# Initialize Lambda client
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    try:
        test_id = event.get('searchTerm')
        
        # Check if test exists
        response = table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        
        items = response.get('Items', [])
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No test found for testID: {test_id}')
            }
        
        status = items[0].get('status')
        # Allow fetching results for Completed or Terminated tests
        if status not in ["Completed", "Terminated"]:
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test {test_id} not yet completed!')
            }

        # Fetch saved result from savedResult table
        result_response = savedResult_table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        
        saved_results = result_response.get('Items', [])
        result_summary = saved_results[0].get('resultSummary', {}) if saved_results else {}
        
        # If no saved results or resultSummary is empty, invoke doSubmitAndCalculateScore to calculate
        if not saved_results or not result_summary:
            invoke_response = lambda_client.invoke(
                FunctionName='doSubmitAndCalculateScore',
                InvocationType='RequestResponse',
                Payload=json.dumps({'testID': test_id})
            )
            
            payload = json.loads(invoke_response['Payload'].read())
            if payload.get('statusCode') == 200:
                # Try to get result directly from the response
                body = payload.get('body', '{}')
                if isinstance(body, str):
                    body = json.loads(body)
                if body.get('result'):
                    result_summary = body.get('result')
                else:
                    # Fallback: fetch from DB
                    result_response = savedResult_table.scan(
                        FilterExpression=Attr('testID').eq(test_id)
                    )
                    saved_results = result_response.get('Items', [])
                    if saved_results:
                        result_summary = saved_results[0].get('resultSummary', {})
            
            if not result_summary:
                return {
                    'statusCode': 404,
                    'body': json.dumps(f'Unable to calculate results for testID: {test_id}')
                }
        
        return {
            'statusCode': 200,
            'body': json.dumps(result_summary, cls=DecimalEncoder)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }            