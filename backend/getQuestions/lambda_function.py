import boto3
from boto3.dynamodb.conditions import Attr
import json
from decimal import Decimal

# Custom JSON encoder to handle Decimal types from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Replace 'YourTableName' with the name of your DynamoDB table
mcq_questions_table = dynamodb.Table('MCQQuestions')
template_table = dynamodb.Table('template')

def get_template_name(template_id):
    """Fetch the template name and isPsychometricReport flag from the template table using templateID."""
    try:
        response = template_table.get_item(Key={"templateID": template_id})
        item = response.get("Item", {})
        return {
            "templateName": item.get("templateName"),
            "isPsychometricReport": item.get("isPsychometricReport", False)
        }
    except Exception as e:
        print(f"Error fetching template data for ID {template_id}: {e}")
        return {"templateName": None, "isPsychometricReport": False}
        
def getAllQuestions(template_ID):
    questions = []
    last_evaluated_key = None
    
    while True:
        # Perform scan operation with pagination handling
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID)
        }

        # Add pagination key if present
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = mcq_questions_table.scan(**scan_params)

        # Append fetched items
        questions.extend(response.get('Items', []))

        # Check if there are more records to fetch
        last_evaluated_key = response.get('LastEvaluatedKey')

        if not last_evaluated_key:
            break  # No more pages, exit loop

    return questions  # Returns all records

def lambda_handler(event, context):
    # Retrieve the email from the event
    passed_TemplateID = event.get('passedTemplateID')
    if not passed_TemplateID:
        return {
            'statusCode': 400,
            'body': json.dumps('TemplateID parameter is required.', cls=DecimalEncoder)
        }

    try:
        # Query the table for items where the email attribute matches e_mail
        #response = table.scan(
        #    FilterExpression=Attr('templateID').eq(passed_TemplateID)
        #)
        
        items = getAllQuestions(passed_TemplateID)
        template_data = get_template_name(passed_TemplateID)
        # items = response.get('Items', [])

        return {
            'statusCode': 200,
            'body': json.dumps({
                'templateName': template_data.get('templateName'), 
                'isPsychometricReport': template_data.get('isPsychometricReport', False),
                'questions': items
            }, cls=DecimalEncoder)
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)}, cls=DecimalEncoder)
        }
