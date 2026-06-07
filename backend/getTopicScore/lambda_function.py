import boto3
import json
from datetime import datetime
from boto3.dynamodb.conditions import Attr

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

    return items[0].get("report", [])  # Returns all records

def lambda_handler(event, context):
    try:

        # Support both direct invocation and API Gateway-style event
        if "testID" in event:
            test_id = event["testID"]
        else:
            body = event.get("body", "{}")
            if isinstance(body, str):
                body = json.loads(body or "{}")
            test_id = body.get("testID")

        if not test_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required field 'testID'"})
            }

        # Fetch all results for this test
        items = getAllItems(test_id)

        # print(items)

        # If no items found, return empty scorecard
        if not items:
            return {
                "statusCode": 200,
                "body": json.dumps([])  # empty array
            }

        # Group by topic and calculate stats
        topic_stats = {}  # { topic: {"total": int, "attempted": int, "correct": int} }

        for item in items:
            # Use separate topic field directly - NO MORE PARSING
            topic = item.get("topic", "General")
            
            # Handle cases where topic might be empty or None
            if not topic or topic.strip() == "" or topic == "__NO_TOPIC__":
                topic = "General"

            if topic not in topic_stats:
                topic_stats[topic] = {
                    "totalQuestions": 0,
                    "attempted": 0,
                    "correct": 0
                }

            stats = topic_stats[topic]

            # Total questions per topic
            stats["totalQuestions"] += 1

            # Attempted: submittedAnswer not empty/None
            submitted = item.get("submittedAnswer")
            if submitted is not None and str(submitted).strip() != "":
                stats["attempted"] += 1

            # Correct: isCorrect is True
            if item.get("isCorrect") is True:
                stats["correct"] += 1

        # Build response array
        response_body = []
        for topic, stats in topic_stats.items():
            total = stats["totalQuestions"]
            correct = stats["correct"]
            percentage = (correct / total * 100) if total > 0 else 0.0

            response_body.append({
                "topic": topic,
                "totalQuestions": total,
                "attempted": stats["attempted"],
                "correct": correct,
                "percentage": round(percentage, 2)  # e.g. 62.5
            })

        return {
            "statusCode": 200,
            "body": json.dumps(response_body)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
