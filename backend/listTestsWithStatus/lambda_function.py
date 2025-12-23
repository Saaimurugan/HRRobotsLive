import json 
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client
dynamodb = boto3.resource("dynamodb")
TRANSACTIONS_TABLE_NAME = "testTransactions"  # Replace with actual table name
TEMPLATE_TABLE_NAME = "template"              # Replace with actual table name

transactions_table = dynamodb.Table(TRANSACTIONS_TABLE_NAME)
template_table = dynamodb.Table(TEMPLATE_TABLE_NAME)

def get_template_name(template_id):
    """Fetch the template name from the template table using templateID."""
    try:
        response = template_table.get_item(Key={"templateID": template_id})
        return response.get("Item", {}).get("templateName", "Unknown")
    except Exception as e:
        print(f"Error fetching template name for ID {template_id}: {e}")
        return "Unknown"

def sort_items(items, sort_key, sort_direction):
    """Sort items by the specified key and direction."""
    if not sort_key or not items:
        return items
    
    reverse = sort_direction == "desc"
    
    # Handle sorting with None values
    def get_sort_value(item):
        value = item.get(sort_key, "")
        if value is None:
            return ""
        return str(value).lower() if isinstance(value, str) else value
    
    return sorted(items, key=get_sort_value, reverse=reverse)

def lambda_handler(event, context):
    try:
        # Extract query parameters
        e_mail = event.get("globalValue")
        page_size = event.get("pageSize", 10)
        last_key = event.get("lastKey")
        search_Name = event.get("searchName", "").strip()
        sort_key = event.get("sortKey", "datetime")
        sort_direction = event.get("sortDirection", "asc")

        if not e_mail:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameter: email"})
            }

        # Base query params - fetch all items for sorting
        query_params = {
            "IndexName": "email-index",  # Ensure GSI exists on 'email'
            "KeyConditionExpression": Key("email").eq(e_mail),
        }

        if search_Name:
            # Add filter if searchName is provided
            query_params["FilterExpression"] = Attr("candidateName").contains(search_Name)

        # Execute query and fetch all items for proper sorting
        all_items = []
        response = transactions_table.query(**query_params)
        all_items.extend(response.get("Items", []))
        
        # Handle pagination to get all items
        while "LastEvaluatedKey" in response:
            query_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]
            response = transactions_table.query(**query_params)
            all_items.extend(response.get("Items", []))

        # Replace templateID with templateName
        for item in all_items:
            if "templateID" in item:
                template_name = get_template_name(item["templateID"])
                item["templateName"] = template_name
                del item["templateID"]

        # Sort all items
        sorted_items = sort_items(all_items, sort_key, sort_direction)
        
        total_count = len(sorted_items)

        # Apply pagination after sorting
        start_index = 0
        if last_key:
            last_key_data = json.loads(last_key)
            # Find the index of the last item
            for i, item in enumerate(sorted_items):
                if item.get("testID") == last_key_data.get("testID"):
                    start_index = i + 1
                    break
        
        end_index = start_index + page_size
        paginated_items = sorted_items[start_index:end_index]
        
        # Determine if there are more items
        has_more = end_index < total_count
        
        # Create last_key for next page
        next_last_key = None
        if has_more and paginated_items:
            last_item = paginated_items[-1]
            next_last_key = json.dumps({"testID": last_item.get("testID")})

        # Return structured response
        return {
            "statusCode": 200,
            "body": json.dumps({
                "items": paginated_items,
                "total_count": total_count,
                "last_key": next_last_key,
                "has_more": has_more
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
