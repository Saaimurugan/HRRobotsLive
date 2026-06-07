"""
Lambda function to add 'type' field to existing questions
Deploy this as a Lambda function and run it once
"""
import boto3
import json
from boto3.dynamodb.conditions import Attr

def lambda_handler(event, context):
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table('MCQQuestions')
    
    # Scan all questions
    print("Scanning all questions...")
    response = table.scan()
    items = response['Items']
    
    # Continue scanning if there are more items
    while 'LastEvaluatedKey' in response:
        response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
        items.extend(response['Items'])
    
    print(f"Found {len(items)} questions")
    
    fixed_count = 0
    skipped_count = 0
    errors = []
    
    for item in items:
        # Skip if type already exists
        if 'type' in item and item['type']:
            skipped_count += 1
            continue
        
        # Determine type based on options field
        question_type = 'mcq'  # default
        
        options = item.get('options', '')
        question_text = item.get('question', '').lower()
        
        # Check if it's a range question
        if options == 'Range' or ('rangeMin' in item and 'rangeMax' in item):
            question_type = 'range'
        # Check if options is an array (MCQ)
        elif isinstance(options, list) and len(options) > 0:
            question_type = 'mcq'
        # Check if it's a code question
        elif any(keyword in question_text for keyword in ['write code', 'write a function', 'implement', 'code to', 'function that', 'write a program']):
            question_type = 'code'
        # Check if it's an elaborate question
        elif any(keyword in question_text for keyword in ['explain', 'describe', 'discuss', 'what are', 'how does', 'why is', 'what is']):
            question_type = 'elaborate'
        # Empty options - likely elaborate or code
        elif options == '' or options == [] or not options:
            # Default to elaborate for text-based questions
            if any(keyword in question_text for keyword in ['write', 'code', 'function', 'implement']):
                question_type = 'code'
            else:
                question_type = 'elaborate'
        
        # Update the item
        try:
            table.update_item(
                Key={
                    'questionID': item['questionID']
                },
                UpdateExpression='SET #type = :type',
                ExpressionAttributeNames={'#type': 'type'},
                ExpressionAttributeValues={':type': question_type}
            )
            fixed_count += 1
            print(f"Fixed {item['questionID']}: set type to '{question_type}'")
        except Exception as e:
            error_msg = f"Error fixing {item['questionID']}: {str(e)}"
            print(error_msg)
            errors.append(error_msg)
    
    result = {
        'total_questions': len(items),
        'fixed': fixed_count,
        'skipped': skipped_count,
        'errors': len(errors),
        'error_details': errors[:10]  # First 10 errors
    }
    
    print(json.dumps(result, indent=2))
    
    return {
        'statusCode': 200,
        'body': json.dumps(result)
    }
