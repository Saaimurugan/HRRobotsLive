import boto3
import json
from decimal import Decimal
from datetime import datetime
from boto3.dynamodb.conditions import Attr

# Custom JSON encoder to handle Decimal types from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Constants
DYNAMODB_TABLE_NAME = "savedResult_table_name"
LITE_MODEL_ID = "amazon.nova-micro-v1:0"
REGION = "us-east-1"

# Initialize clients
dynamodb = boto3.resource("dynamodb", region_name=REGION)
table = dynamodb.Table(DYNAMODB_TABLE_NAME)
bedrock_client = boto3.client("bedrock-runtime", region_name=REGION)

def getAllItems(testID):
    items = []
    last_evaluated_key = None
    
    while True:
        print(items)
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('testID').eq(testID)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = table.scan(**scan_params)

        # Append fetched items
        items.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return items  # Returns all records

def lambda_handler(event, context):
    try:
        # Extract parameters from the request
        search_term = event.get("searchTerm")
        user_email = event.get("globalValue")

        if not search_term:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing searchTerm.'})
            }

        #response = table.scan()
        #items = response.get("Items", [])
        items = getAllItems(search_term)
        if not items:
            return {
                'statusCode': 404,
                'body': json.dumps({'message': 'No matching testID found in any item.'})
            }

        print("DEBUG: Retrieved items from DynamoDB:")
        for item in items:
            print(json.dumps(item, indent=2, cls=DecimalEncoder))
        # Scan for item with matching testID
        # Try to filter by testID after logging
        #filtered_items = [item for item in items if item.get("testID") == search_term]
        #if not filtered_items:
        #    return {
        #        'statusCode': 404,
        #        'body': json.dumps({'message': 'No matching testID found in any item.'})
        #    }

        #result_data = filtered_items[0]
        result_data = items[0]

        # Construct the prompt
        prompt = f"""
        You are an expert assessment analyst. Analyze the following MCQ test results and generate a detailed report on the user's performance.

        {result_data}

        Provide insights such as:
        - Group the analysis based on Topic of the questions
        - Don't give any numbers related to answered or correct questions
        - Areas of strength and weakness
        - Suggestions for improvement
        - Any noticeable trends

        Format the report in professional HTML using appropriate tags like <h1>, <h2>, <ul>, <p>, etc.
        """
        #print(prompt)
        request_body = {
            "schemaVersion": "messages-v1",
            "messages": [{"role": "user", "content": [{"text": prompt}]}],
            "system": [{"text": "You are a helpful assistant that generates HTML-based performance reports from MCQ test data."}],
            "inferenceConfig": {
                "max_new_tokens": 10000,
                "top_p": 0.9,
                "top_k": 20,
                "temperature": 0.9
            }
        }

        # Generate report using Bedrock
        response = bedrock_client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID,
            body=json.dumps(request_body)
        )

        stream = response.get("body")
        if not stream:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'No response received from model.'})
            }

        report_html = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                report_html += chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'text/html'},
            'body': report_html
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
