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

def get_test_count_by_status(user_email):
    """Get test count grouped by status for a user"""
    status_counts = {
        'completed': 0,
        'pending': 0,
        'failed': 0,
        'in_progress': 0
    }
    
    last_evaluated_key = None
    
    while True:
        scan_params = {
            'FilterExpression': Attr('email').eq(user_email)
        }
        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key
        
        response = test_transactions_table.scan(**scan_params)
        
        for transaction in response.get('Items', []):
            status = transaction.get('status', 'pending').lower()
            if status in status_counts:
                status_counts[status] += 1
            else:
                # Count unknown statuses as pending
                status_counts['pending'] += 1
        
        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break
    
    return status_counts

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

def get_date_wise_data(items, date_field, days_back=30):
    """Get items grouped by date for the last N days"""
    date_buckets = {}
    today = datetime.datetime.utcnow().date()
    
    # Initialize buckets for last N days
    for i in range(days_back):
        date = (today - datetime.timedelta(days=i)).isoformat()
        date_buckets[date] = 0
    
    # Count items by date
    for item in items:
        if date_field in item:
            item_date = item[date_field]
            if isinstance(item_date, str):
                # Extract date part (YYYY-MM-DD)
                item_date_only = item_date.split('T')[0]
                if item_date_only in date_buckets:
                    date_buckets[item_date_only] += 1
    
    # Sort by date (ascending)
    sorted_dates = sorted(date_buckets.keys())
    return {date: date_buckets[date] for date in sorted_dates}

def get_date_wise_status_data(items, date_field, status_field, days_back=30):
    """Get items grouped by date and status for the last N days"""
    date_status_buckets = {}
    today = datetime.datetime.utcnow().date()
    
    # Initialize buckets for last N days with all statuses
    statuses = ['completed', 'pending', 'failed', 'in_progress']
    for i in range(days_back):
        date = (today - datetime.timedelta(days=i)).isoformat()
        date_status_buckets[date] = {status: 0 for status in statuses}
    
    # Count items by date and status
    for item in items:
        if date_field in item and status_field in item:
            item_date = item[date_field]
            item_status = item[status_field].lower()
            if isinstance(item_date, str):
                # Extract date part (YYYY-MM-DD)
                item_date_only = item_date.split('T')[0]
                if item_date_only in date_status_buckets:
                    if item_status in date_status_buckets[item_date_only]:
                        date_status_buckets[item_date_only][item_status] += 1
    
    # Sort by date (ascending)
    sorted_dates = sorted(date_status_buckets.keys())
    return {date: date_status_buckets[date] for date in sorted_dates}

def lambda_handler(event, context):
    try:
        print(f"Event: {event}")
        print(f"Method: {event.get('httpMethod', 'unknown')}")
        
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
        
        # Generate date-wise chart data (last 30 days)
        users_date_wise = get_date_wise_data(all_users, 'createdAt', 30)
        templates_date_wise = get_date_wise_data(all_templates, 'datetime', 30)
        tests_date_wise = get_date_wise_data(all_test_transactions, 'datetime', 30)
        tests_status_date_wise = get_date_wise_status_data(all_test_transactions, 'datetime', 'status', 30)
        
        # Generate time period data
        users_today = count_items_by_date(all_users, 'createdAt', 0)
        users_this_week = count_items_by_date(all_users, 'createdAt', 7)
        users_this_month = count_items_by_date(all_users, 'createdAt', 30)
        
        templates_today = count_items_by_date(all_templates, 'datetime', 0)
        templates_this_week = count_items_by_date(all_templates, 'datetime', 7)
        templates_this_month = count_items_by_date(all_templates, 'datetime', 30)
        
        tests_today = count_items_by_date(all_test_transactions, 'datetime', 0)
        tests_this_week = count_items_by_date(all_test_transactions, 'datetime', 7)
        tests_this_month = count_items_by_date(all_test_transactions, 'datetime', 30)
        
        # Count test transactions by status
        status_counts = {
            'completed': 0,
            'pending': 0,
            'failed': 0,
            'in_progress': 0
        }
        for transaction in all_test_transactions:
            status = transaction.get('status', 'pending').lower()
            if status in status_counts:
                status_counts[status] += 1
        
        # Count templates by status (if templates have status field)
        template_status_counts = {
            'active': 0,
            'archived': 0,
            'draft': 0
        }
        for template in all_templates:
            status = template.get('status', 'active').lower()
            if status in template_status_counts:
                template_status_counts[status] += 1
            else:
                template_status_counts['active'] += 1
        
        # Group templates by user
        templates_by_user = {}
        for template in all_templates:
            user_email = template.get('email', 'Unknown')
            if user_email not in templates_by_user:
                templates_by_user[user_email] = 0
            templates_by_user[user_email] += 1
        
        # Group test transactions by user
        tests_by_user = {}
        for transaction in all_test_transactions:
            user_email = transaction.get('email', 'Unknown')
            if user_email not in tests_by_user:
                tests_by_user[user_email] = 0
            tests_by_user[user_email] += 1
        
        # Group test transactions by template
        tests_by_template = {}
        for transaction in all_test_transactions:
            template_id = transaction.get('templateID', 'Unknown')
            if template_id not in tests_by_template:
                tests_by_template[template_id] = 0
            tests_by_template[template_id] += 1
        
        # Group templates by status
        templates_by_status = {}
        for template in all_templates:
            status = template.get('status', 'active').lower()
            if status not in templates_by_status:
                templates_by_status[status] = 0
            templates_by_status[status] += 1
        
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
                'testCountByStatus': get_test_count_by_status(user_email),
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
            'chartData': {
                'usersDateWise': users_date_wise,
                'templatesDateWise': templates_date_wise,
                'testsDateWise': tests_date_wise,
                'testsStatusDateWise': tests_status_date_wise,
                'timePeriods': {
                    'users': {
                        'today': users_today,
                        'thisWeek': users_this_week,
                        'thisMonth': users_this_month
                    },
                    'templates': {
                        'today': templates_today,
                        'thisWeek': templates_this_week,
                        'thisMonth': templates_this_month
                    },
                    'tests': {
                        'today': tests_today,
                        'thisWeek': tests_this_week,
                        'thisMonth': tests_this_month
                    }
                },
                'comparisons': {
                    'usersVsTemplates': {
                        'users': total_users,
                        'templates': total_templates
                    },
                    'usersVsTests': {
                        'users': total_users,
                        'tests': total_test_transactions
                    },
                    'templatesVsTests': {
                        'templates': total_templates,
                        'tests': total_test_transactions
                    },
                    'statusCounts': status_counts,
                    'templateStatusCounts': template_status_counts
                },
                'groupedData': {
                    'templatesByUser': templates_by_user,
                    'testsByUser': tests_by_user,
                    'testsByTemplate': tests_by_template,
                    'templatesByStatus': templates_by_status
                }
            },
            'users': users_data
        }
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
            },
            'body': json.dumps(response_data, cls=DecimalEncoder)
        }
    
    except Exception as e:
        print(f'Error: {str(e)}')
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': str(e)})
        }
