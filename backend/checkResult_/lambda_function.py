import boto3
import json
from decimal import Decimal
from boto3.dynamodb.conditions import Key, Attr

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize clients OUTSIDE handler for connection reuse (Lambda best practice)
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table("testTransactions")
savedResult_table = dynamodb.Table("savedResult_table_name")
lambda_client = boto3.client('lambda')

def lambda_handler(event, context):
    try:
        test_id = event.get('searchTerm')
        
        if not test_id:
            return {
                'statusCode': 400,
                'body': json.dumps('Missing required parameter: searchTerm')
            }
        
        # Try GSI first, fall back to full scan if GSI doesn't exist
        items = []
        try:
            response = table.query(
                IndexName="testID-index",
                KeyConditionExpression=Key('testID').eq(test_id)
            )
            items = response.get('Items', [])
        except dynamodb.meta.client.exceptions.ResourceNotFoundException:
            # GSI doesn't exist, use scan
            print("GSI testID-index not found, using scan")
            response = table.scan(FilterExpression=Attr('testID').eq(test_id))
            items = response.get('Items', [])
        except Exception as e:
            # Other GSI error (e.g., ValidationException), fall back to scan
            print(f"GSI query failed: {e}, falling back to scan")
            response = table.scan(FilterExpression=Attr('testID').eq(test_id))
            items = response.get('Items', [])
        
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No test found for testID: {test_id}')
            }
        
        status = items[0].get('status')
        if status not in ["Completed", "Terminated"]:
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test {test_id} not yet completed!')
            }

        # Fetch saved result - try GSI first, fall back to scan
        saved_results = []
        try:
            result_response = savedResult_table.query(
                IndexName="testID-index",
                KeyConditionExpression=Key('testID').eq(test_id)
            )
            saved_results = result_response.get('Items', [])
        except Exception:
            result_response = savedResult_table.scan(
                FilterExpression=Attr('testID').eq(test_id)
            )
            saved_results = result_response.get('Items', [])
        
        result_summary = saved_results[0].get('resultSummary', {}) if saved_results else {}
        
        # If no saved results, calculate them
        if not saved_results or not result_summary:
            invoke_response = lambda_client.invoke(
                FunctionName='doSubmitAndCalculateScore',
                InvocationType='RequestResponse',
                Payload=json.dumps({'testID': test_id})
            )
            
            payload = json.loads(invoke_response['Payload'].read())
            if payload.get('statusCode') == 200:
                body = payload.get('body', '{}')
                if isinstance(body, str):
                    body = json.loads(body)
                if body.get('result'):
                    result_summary = body.get('result')
                else:
                    # Fetch from DB
                    try:
                        result_response = savedResult_table.query(
                            IndexName="testID-index",
                            KeyConditionExpression=Key('testID').eq(test_id)
                        )
                        saved_results = result_response.get('Items', [])
                    except Exception:
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