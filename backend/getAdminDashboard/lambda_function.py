import boto3
import json
import datetime
from decimal import Decimal
from boto3.dynamodb.conditions import Attr, Key

# Custom JSON encoder to handle Decimal types from DynamoDB
class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')

# Tables
users_table = dynamodb.Table('userDetails')
templates_table = dynamodb.Table('template')
questions_table = dynamodb.Table('MCQQuestions')
test_transactions_table = dynamodb.Table('testTransactions')
auth_table = dynamodb.Table('authTable')

ADMIN_EMAIL = 'saaimurugan@gmail.com'

def get_date_range(days_back):
    """Get date range for filtering"""
    today = datetime.datetime.utcnow()
    start_date = (today - datetime.timedelta(days=days_back)).isoformat()
    end_date = today.isoformat()
    return start_date, end_date

def get_all_users():
    """Fetch all users from userDetails table"""
    users = []
    last_evaluated_key = None
    
    while True:
        scan_params = {}
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = users_table.scan(**scan_params)
        users.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return users

def get_user_templates(email):
    """Fetch all templates for a user"""
    templates = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('email').eq(email)
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = templates_table.scan(**scan_params)
        templates.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return templates

def get_template_questions(template_id):
    """Fetch all questions for a template"""
    questions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_id)
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = questions_table.scan(**scan_params)
        questions.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return questions

def get_template_test_transactions(template_id):
    """Fetch all test transactions for a template"""
    transactions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_id)
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = test_transactions_table.scan(**scan_params)
        transactions.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return transactions

def get_all_test_transactions():
    """Fetch all test transactions"""
    transactions = []
    last_evaluated_key = None
    
    while True:
        scan_params = {}
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = test_transactions_table.scan(**scan_params)
        transactions.extend(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return transactions

def get_active_users():
    """Get count of currently active users (logged in)"""
    active_count = 0
    last_evaluated_key = None
    
    while True:
        scan_params = {}
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = auth_table.scan(**scan_params)
        active_count += len(response.get('Items', []))
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return active_count

def count_items_by_date(items, date_field, days_back):
    """Count items created in the last N days"""
    start_date, end_date = get_date_range(days_back)
    count = 0
    
    for item in items:
        if date_field in item:
            item_date = item[date_field]
            if isinstance(item_date, str):
                if start_date <= item_date <= end_date:
                    count += 1
    
    return count

def lambda_handler(event, context):
    try:
        # Extract email from JWT token (passed by authorizer)
        request_context = event.get('requestContext', {})
        authorizer = request_context.get('authorizer', {})
        user_email = authorizer.get('principalId', '')
        
        # Check if user is admin
        if user_email.lower() != ADMIN_EMAIL.lower():
            return {
                'statusCode': 403,
                'body': json.dumps({'error': 'Access denied. Admin access required.'})
            }
        
        # Fetch all data
        all_users = get_all_users()
        all_templates = templates_table.scan()['Items']
        all_test_transactions = get_all_test_transactions()
        
        # Calculate summary statistics
        total_users = len(all_users)
        total_templates = len(all_templates)
        total_test_transactions = len(all_test_transactions)
        
        users_created_today = count_items_by_date(all_users, 'createdAt', 0)
        users_created_this_week = count_items_by_date(all_users, 'createdAt', 7)
        
        templates_created_today = count_items_by_date(all_templates, 'datetime', 0)
        templates_created_this_week = count_items_by_date(all_templates, 'datetime', 7)
        
        test_transactions_created_today = count_items_by_date(all_test_transactions, 'datetime', 0)
        test_transactions_created_this_week = count_items_by_date(all_test_transactions, 'datetime', 7)
        
        active_users = get_active_users()
        
        # Build detailed user data with nested templates and transactions
        users_data = []
        for user in all_users:
            user_email = user.get('userId', '')
            user_templates = get_user_templates(user_email)
            
            # Build templates with nested transactions
            templates_data = []
            for template in user_templates:
                template_id = template.get('templateID', '')
                template_questions = get_template_questions(template_id)
                template_transactions = get_template_test_transactions(template_id)
                
                templates_data.append({
                    'templateID': template_id,
                    'templateName': template.get('templateName', 'Unnamed'),
                    'datetime': template.get('datetime', ''),
                    'questionCount': len(template_questions),
                    'testTransactionCount': len(template_transactions),
                    'testTransactions': [
                        {
                            'testID': t.get('testID', ''),
                            'candidateName': t.get('candidateName', ''),
                            'email': t.get('email', ''),
                            'status': t.get('status', 'pending'),
                            'datetime': t.get('datetime', ''),
                            'score': t.get('score')
                        }
                        for t in template_transactions[:10]  # Limit to 10 most recent
                    ]
                })
            
            # Check if user is active
            is_active = False
            try:
                auth_response = auth_table.get_item(Key={'email': user_email})
                is_active = 'Item' in auth_response
            except:
                pass
            
            users_data.append({
                'userId': user_email,
                'createdAt': user.get('createdAt', ''),
                'isVerified': user.get('isVerified', False),
                'isActive': is_active,
                'templateCount': len(user_templates),
                'testCount': len([t for template in user_templates for t in get_template_test_transactions(template.get('templateID', ''))]),
                'lastActive': user.get('lastActive'),
                'templates': templates_data
            })
        
        response_data = {
            'totalUsers': total_users,
            'totalTemplates': total_templates,
            'totalTestTransactions': total_test_transactions,
            'usersCreatedToday': users_created_today,
            'usersCreatedThisWeek': users_created_this_week,
            'templatesCreatedToday': templates_created_today,
            'templatesCreatedThisWeek': templates_created_this_week,
            'testTransactionsCreatedToday': test_transactions_created_today,
            'testTransactionsCreatedThisWeek': test_transactions_created_this_week,
            'activeUsers': active_users,
            'users': users_data
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps(response_data, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f'Error: {str(e)}')
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
