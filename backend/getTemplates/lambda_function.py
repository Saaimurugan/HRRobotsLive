import boto3
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Replace 'YourTableName' with the name of your DynamoDB table
table = dynamodb.Table('template')
questions_table = dynamodb.Table('MCQQuestions')
config_table = dynamodb.Table('testConfiguration')

def getAllTemplates(e_mail):
    templates = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('email').eq(e_mail)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = table.scan(**scan_params)

        # Append fetched items
        templates.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return templates  # Returns all records

def getAllAssignedTemplates(e_mail):
    templates = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('AssignedTo').eq(e_mail)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = table.scan(**scan_params)

        # Append fetched items
        templates.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return templates  # Returns all records

def getQuestionCount(template_id):
    """Get the count of questions for a given template ID"""
    count = 0
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_id),
            'Select': 'COUNT'
        }
        
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = questions_table.scan(**scan_params)
        count += response.get('Count', 0)
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return count

def getTestConfiguration(template_id):
    """Get the test configuration for a given template ID"""
    try:
        from boto3.dynamodb.conditions import Key
        response = config_table.query(
            KeyConditionExpression=Key('testConfigurationID').eq(template_id)
        )
        items = response.get('Items', [])
        if items:
            return items[0]
        return None
    except Exception:
        return None

def lambda_handler(event, context):
    # Retrieve the email from the event
    e_mail = event.get('globalValue')
    if not e_mail:
        return {
            'statusCode': 400,
            'body': 'Email parameter is required.'
        }

    assignedEmail = event.get('globalValue')
    if not assignedEmail:
        return {
            'statusCode': 400,
            'body': 'Email parameter is required.'
        }

    try:
        # Query the table for items where the email attribute matches e_mail
        # response = table.scan(
        #    FilterExpression=Attr('email').eq(e_mail)
        #)
        # Initially, items is empty
        items = []

        # Fetch templates
        fetched_items = getAllTemplates(e_mail)
        print(f"Templates owned by {e_mail}: {len(fetched_items)}")

        # If fetched_items is not empty, update items
        if fetched_items:
            items = fetched_items
       
        if assignedEmail:
            assignedItems = getAllAssignedTemplates(assignedEmail)
            print(f"Templates assigned to {assignedEmail}: {len(assignedItems)}")
            #Merge the two lists
            items.extend(assignedItems)

        print(f"Total templates for {e_mail}: {len(items)}")

        if not items:
            return {
                'statusCode': 404,
                'body': 'No items found for the given email.'
            }

        # Sort templates by datetime in descending order (newest first)
        items.sort(key=lambda x: x.get('datetime', ''), reverse=True)

        # Add question count and numberOfQuestions configuration to each template
        for item in items:
            template_id = item.get('templateID')
            if template_id:
                # Get question count
                item['questionCount'] = getQuestionCount(template_id)
                
                # Get numberOfQuestions from configuration
                config = getTestConfiguration(template_id)
                if config:
                    item['numberOfQuestions'] = int(config.get('numberOfQuestions', 10))
                else:
                    item['numberOfQuestions'] = 10  # Default value

        return {
            'statusCode': 200,
            'body': items
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': str(e)
        }
