import json 
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client OUTSIDE handler for connection reuse
dynamodb = boto3.resource("dynamodb")
TRANSACTIONS_TABLE_NAME = "testTransactions"

transactions_table = dynamodb.Table(TRANSACTIONS_TABLE_NAME)

def lambda_handler(event, context):
    try:
        e_mail = event.get("globalValue")
        search_name = event.get("searchName", "").strip()

        if not e_mail:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameter: email"})
            }

        # Query with projection to fetch only needed attributes
        query_params = {
            "IndexName": "email-index",
            "KeyConditionExpression": Key("email").eq(e_mail),
            "ProjectionExpression": "testID, candidateName"
        }

        if search_name:
            query_params["FilterExpression"] = Attr("candidateName").contains(search_name)

        # Fetch all items to get total count
        all_items = []
        response = transactions_table.query(**query_params)
        all_items.extend(response.get("Items", []))
        
        # Paginate through all results to get complete count
        # Limit total items fetched to prevent memory issues
        MAX_ITEMS = 10000
        while "LastEvaluatedKey" in response and len(all_items) < MAX_ITEMS:
            query_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]
            response = transactions_table.query(**query_params)
            all_items.extend(response.get("Items", []))

        total_count = len(all_items)

        return {
            "statusCode": 200,
            "body": json.dumps({
                "total_count": total_count,
                "message": f"Total tests: {total_count}"
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
