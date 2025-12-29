import json 
import boto3
from boto3.dynamodb.conditions import Key, Attr

# Initialize DynamoDB client OUTSIDE handler for connection reuse
dynamodb = boto3.resource("dynamodb")
TRANSACTIONS_TABLE_NAME = "testTransactions"
TEMPLATE_TABLE_NAME = "template"

transactions_table = dynamodb.Table(TRANSACTIONS_TABLE_NAME)
template_table = dynamodb.Table(TEMPLATE_TABLE_NAME)

# Cache for template names to avoid repeated lookups
template_cache = {}

def get_template_name(template_id):
    """Fetch the template name with caching."""
    if template_id in template_cache:
        return template_cache[template_id]
    try:
        response = template_table.get_item(Key={"templateID": template_id})
        name = response.get("Item", {}).get("templateName", "Unknown")
        template_cache[template_id] = name
        return name
    except Exception as e:
        print(f"Error fetching template name for ID {template_id}: {e}")
        return "Unknown"

def batch_get_template_names(template_ids):
    """Batch fetch template names to reduce DB calls."""
    unique_ids = list(set(template_ids) - set(template_cache.keys()))
    if not unique_ids:
        return
    
    # DynamoDB BatchGetItem supports up to 100 items
    for i in range(0, len(unique_ids), 100):
        batch_ids = unique_ids[i:i+100]
        try:
            response = dynamodb.batch_get_item(
                RequestItems={
                    TEMPLATE_TABLE_NAME: {
                        'Keys': [{'templateID': tid} for tid in batch_ids]
                    }
                }
            )
            for item in response.get('Responses', {}).get(TEMPLATE_TABLE_NAME, []):
                template_cache[item['templateID']] = item.get('templateName', 'Unknown')
        except Exception as e:
            print(f"Batch get error: {e}")
            # Fallback to individual lookups
            for tid in batch_ids:
                if tid not in template_cache:
                    get_template_name(tid)

def sort_items(items, sort_key, sort_direction):
    """Sort items by the specified key and direction."""
    if not sort_key or not items:
        return items
    
    reverse = sort_direction == "desc"
    
    def get_sort_value(item):
        value = item.get(sort_key, "")
        if value is None:
            return ""
        return str(value).lower() if isinstance(value, str) else value
    
    return sorted(items, key=get_sort_value, reverse=reverse)

def lambda_handler(event, context):
    try:
        e_mail = event.get("globalValue")
        page_size = event.get("pageSize", 10)
        last_key = event.get("lastKey")
        search_Name = event.get("searchName", "").strip()
        sort_key = event.get("sortKey", "datetime")
        sort_direction = event.get("sortDirection", "asc")
        # New: offset-based pagination for sorted results
        offset = event.get("offset", 0)

        if not e_mail:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Missing required parameter: email"})
            }

        # Query with projection to fetch only needed attributes
        query_params = {
            "IndexName": "email-index",
            "KeyConditionExpression": Key("email").eq(e_mail),
            "ProjectionExpression": "testID, candidateName, #dt, #st, templateID, email",
            "ExpressionAttributeNames": {"#dt": "datetime", "#st": "status"}
        }

        if search_Name:
            query_params["FilterExpression"] = Attr("candidateName").contains(search_Name)

        # Fetch items with limit for better performance on large datasets
        all_items = []
        response = transactions_table.query(**query_params)
        all_items.extend(response.get("Items", []))
        
        # Only paginate through DynamoDB if we need more items
        # Limit total items fetched to prevent memory issues
        MAX_ITEMS = 1000
        while "LastEvaluatedKey" in response and len(all_items) < MAX_ITEMS:
            query_params["ExclusiveStartKey"] = response["LastEvaluatedKey"]
            response = transactions_table.query(**query_params)
            all_items.extend(response.get("Items", []))

        # Batch fetch template names (much faster than individual lookups)
        template_ids = [item.get("templateID") for item in all_items if item.get("templateID")]
        batch_get_template_names(template_ids)
        
        # Replace templateID with templateName using cached values
        for item in all_items:
            if "templateID" in item:
                item["templateName"] = template_cache.get(item["templateID"], "Unknown")
                del item["templateID"]

        # Sort all items
        sorted_items = sort_items(all_items, sort_key, sort_direction)
        total_count = len(sorted_items)

        # Use offset-based pagination (more efficient for sorted data)
        start_index = offset
        if last_key and not offset:
            # Fallback to testID-based pagination if offset not provided
            last_key_data = json.loads(last_key)
            for i, item in enumerate(sorted_items):
                if item.get("testID") == last_key_data.get("testID"):
                    start_index = i + 1
                    break
        
        end_index = start_index + page_size
        paginated_items = sorted_items[start_index:end_index]
        
        has_more = end_index < total_count
        
        next_last_key = None
        if has_more and paginated_items:
            last_item = paginated_items[-1]
            next_last_key = json.dumps({"testID": last_item.get("testID")})

        return {
            "statusCode": 200,
            "body": json.dumps({
                "items": paginated_items,
                "total_count": total_count,
                "last_key": next_last_key,
                "has_more": has_more,
                "next_offset": end_index if has_more else None
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
