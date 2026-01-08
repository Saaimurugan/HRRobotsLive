import json
import boto3
import random
from datetime import datetime
import dateutil.tz
from boto3.dynamodb.conditions import Attr, Key
from concurrent.futures import ThreadPoolExecutor
import threading
import sys
import os

# Add utils directory to path for encryption utilities
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'utils'))
from encryption import QuestionEncryption

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')
config_table = dynamodb.Table('testConfiguration')

# Thread-local storage for DynamoDB resources
thread_local = threading.local()

# Simple in-memory cache for config data (expires after 5 minutes)
config_cache = {}
CACHE_EXPIRY = 300  # 5 minutes


def get_cached_config(template_id):
    """Get test configuration with caching"""
    current_time = datetime.now().timestamp()
    cache_key = f"config_{template_id}"
    
    # Check cache
    if cache_key in config_cache:
        cached_data, timestamp = config_cache[cache_key]
        if current_time - timestamp < CACHE_EXPIRY:
            return cached_data
    
    # Fetch from database
    config_response = config_table.query(
        KeyConditionExpression=Key('testConfigurationID').eq(template_id)
    )
    config_items = config_response.get('Items', [])
    
    # Default to 50 if no configuration found
    if config_items:
        num_questions_for_test = int(config_items[0].get('numberOfQuestions', 50))
    else:
        num_questions_for_test = 50
    
    # Cache the result
    config_cache[cache_key] = (num_questions_for_test, current_time)
    
    return num_questions_for_test


def get_thread_local_tables():
    """Get thread-local DynamoDB table instances for concurrent operations"""
    if not hasattr(thread_local, 'tables'):
        dynamodb = boto3.resource('dynamodb')
        thread_local.tables = {
            'questions': dynamodb.Table('MCQQuestions'),
            'answers': dynamodb.Table('MCQAnswers'),
            'template_test': dynamodb.Table('testTransactions'),
            'config': dynamodb.Table('testConfiguration')
        }
    return thread_local.tables


def getAllQuestions(template_ID):
    """Optimized to use query instead of scan if possible, with pagination"""
    tables = get_thread_local_tables()
    questions_table = tables['questions']
    
    questions = []
    last_evaluated_key = None
    
    # Use batch processing with smaller page sizes for better performance
    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID),
            'Limit': 100  # Process in smaller batches
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = questions_table.scan(**scan_params)
        questions.extend(response.get('Items', []))

        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break

    return questions


def getAllPreviousAnswers(test_id):
    """Optimized to use query instead of scan if possible, with pagination"""
    tables = get_thread_local_tables()
    answers_table = tables['answers']
    
    answers = []
    last_evaluated_key = None

    # Use batch processing with smaller page sizes for better performance
    while True:
        scan_params = {
            'FilterExpression': Attr('testID').eq(test_id),
            'Limit': 100  # Process in smaller batches
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = answers_table.scan(**scan_params)
        answers.extend(response.get('Items', []))

        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break

    return answers


def fetch_data_parallel(template_id, test_id):
    """Fetch questions and answers in parallel"""
    with ThreadPoolExecutor(max_workers=3) as executor:
        # Submit all tasks
        questions_future = executor.submit(getAllQuestions, template_id)
        answers_future = executor.submit(getAllPreviousAnswers, test_id)
        
        # Get results
        questions = questions_future.result()
        previous_answers = answers_future.result()
        
    return questions, previous_answers


def extract_topic_from_question(question_item):
    """
    Use separate topic field directly - NO MORE PARSING
    """
    q = question_item.copy()
    
    # Use separate topic field directly
    topic = q.get('topic', '__NO_TOPIC__')
    if not topic or topic == '':
        topic = '__NO_TOPIC__'
    
    q["topic"] = topic
    return topic, q


def select_questions_without_repetition(questions, previous_answers_dict, num_questions_for_test):
    """
    Select questions ensuring no repetition and balanced topic distribution
    """
    # Group questions by topic
    questions_by_topic = {}
    for question in questions:
        topic, processed_question = extract_topic_from_question(question)
        
        # Skip already answered questions
        if question['questionID'] in previous_answers_dict:
            continue
            
        if topic not in questions_by_topic:
            questions_by_topic[topic] = []
        questions_by_topic[topic].append(processed_question)
    
    # Calculate questions per topic (proportional distribution)
    total_available = sum(len(topic_questions) for topic_questions in questions_by_topic.values())
    
    if total_available == 0:
        return []
    
    # Limit to available questions or requested count
    actual_question_count = min(num_questions_for_test, total_available)
    
    selected_questions = []
    topics = list(questions_by_topic.keys())
    
    # Distribute questions proportionally across topics
    for i in range(actual_question_count):
        topic_index = i % len(topics)
        topic = topics[topic_index]
        
        if questions_by_topic[topic]:
            # Randomly select from available questions in this topic
            selected_question = random.choice(questions_by_topic[topic])
            selected_questions.append(selected_question)
            
            # Remove selected question to prevent repetition
            questions_by_topic[topic].remove(selected_question)
            
            # Remove empty topics
            if not questions_by_topic[topic]:
                topics.remove(topic)
                if not topics:  # No more topics available
                    break
    
    # Shuffle the final selection to randomize order
    random.shuffle(selected_questions)
    
    return selected_questions


def lambda_handler(event, context):
    try:
        test_id = event.get('testID')
        if not test_id:
            return {
                'statusCode': 400,
                'body': json.dumps('testID is required')
            }

        candidate_name = event.get('candidateName')
        if not candidate_name:
            return {
                'statusCode': 400,
                'body': json.dumps('candidateName is required')
            }

        # Fetch template IDs for the given testID
        response = template_test_table.scan(
            FilterExpression=Attr('testID').eq(test_id)
        )
        template_items = response.get('Items', [])

        if not template_items:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No templates found for testID: {test_id}')
            }

        template_ids = [item['templateID'] for item in template_items]
        status = template_items[0].get('status')

        if status == "Terminated":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test Terminated, please contact your recruiter for more details - ({test_id}).')
            }

        if status == "Completed":
            return {
                'statusCode': 404,
                'body': json.dumps(f'Test already completed - ({test_id}).')
            }

        if status == "Not Started":
            status = "In Progress"
            # Get current date and time and convert to IST
            indian = dateutil.tz.gettz('Asia/Kolkata')
            indian_time = datetime.now(tz=indian)
            current_time = indian_time.strftime("%Y-%m-%d %H:%M:%S")

            template_test_table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status, #datetime = :new_datetime, #candidateName = :new_candidateName',
                ExpressionAttributeNames={'#status': 'status', '#datetime': 'datetime', '#candidateName': 'candidateName'},
                ExpressionAttributeValues={':new_status': status, ':new_datetime': current_time, ':new_candidateName': candidate_name}
            )

        # Fetch questions and answers in parallel
        template_id = template_ids[0]
        questions, previous_answers = fetch_data_parallel(template_id, test_id)

        if not questions:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No questions found for templateID: {template_id}')
            }

        # Fetch test configuration with caching
        num_questions_for_test = get_cached_config(template_id)

        # Build previous answers dictionary
        previous_answers_dict = {answer['questionID']: answer.get('answer') for answer in previous_answers}

        # Select questions without repetition
        selected_questions = select_questions_without_repetition(
            questions, previous_answers_dict, num_questions_for_test
        )

        if not selected_questions:
            return {
                'statusCode': 200,
                'body': json.dumps({
                    'message': 'No more questions available',
                    'questions': [],
                    'total_questions': 0,
                    'answered_count': len(previous_answers_dict)
                })
            }

        # Generate encryption key for this test session
        encryption_key = QuestionEncryption.generate_test_key(test_id, candidate_name)
        key_hint = QuestionEncryption.create_key_hint(encryption_key)

        # Encrypt all questions
        encrypted_questions = QuestionEncryption.encrypt_questions_bulk(selected_questions, encryption_key)

        # Build topic summary
        topic_summary = {}
        for question in selected_questions:
            topic = question.get('topic', '__NO_TOPIC__')
            topic_summary[topic] = topic_summary.get(topic, 0) + 1

        return {
            'statusCode': 200,
            'body': json.dumps({
                'questions': encrypted_questions,
                'total_questions': len(encrypted_questions),
                'answered_count': len(previous_answers_dict),
                'topic_summary': topic_summary,
                'encryption_key': encryption_key.hex(),  # Send key as hex string
                'key_hint': key_hint,
                'test_config': {
                    'template_id': template_id,
                    'max_questions': num_questions_for_test
                }
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }