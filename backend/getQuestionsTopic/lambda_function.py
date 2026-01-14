import json
import boto3
import random
from datetime import datetime
import dateutil.tz
from boto3.dynamodb.conditions import Attr
import time
import hashlib

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')

# In-memory cache to prevent duplicate requests within a short time window
recent_requests = {}
REQUEST_CACHE_DURATION = 2  # seconds


def is_duplicate_request(test_id, candidate_name):
    """
    Check if this is a duplicate request within the cache duration
    Returns (is_duplicate, cached_response)
    """
    current_time = time.time()
    request_key = f"{test_id}_{candidate_name}"
    
    # Clean up old entries
    keys_to_remove = []
    for key, (timestamp, response) in recent_requests.items():
        if current_time - timestamp > REQUEST_CACHE_DURATION:
            keys_to_remove.append(key)
    
    for key in keys_to_remove:
        del recent_requests[key]
    
    # Check if this request is a duplicate
    if request_key in recent_requests:
        timestamp, cached_response = recent_requests[request_key]
        if current_time - timestamp < REQUEST_CACHE_DURATION:
            return True, cached_response
    
    return False, None


def cache_request_response(test_id, candidate_name, response):
    """
    Cache the response for this request
    """
    request_key = f"{test_id}_{candidate_name}"
    recent_requests[request_key] = (time.time(), response)


def getAllQuestions(template_ID):
    questions = []
    last_evaluated_key = None

    while True:
        scan_params = {
            'FilterExpression': Attr('templateID').eq(template_ID)
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
    answers = []
    last_evaluated_key = None

    while True:
        scan_params = {
            'FilterExpression': Attr('testID').eq(test_id)
        }

        if last_evaluated_key:
            scan_params['ExclusiveStartKey'] = last_evaluated_key

        response = answers_table.scan(**scan_params)
        answers.extend(response.get('Items', []))

        last_evaluated_key = response.get('LastEvaluatedKey')
        if not last_evaluated_key:
            break

    return answers


def _get_question_text_key(q):
    """
    Try common possible keys that store question text.
    """
    for k in ("question", "questionText", "text", "prompt"):
        if k in q and isinstance(q[k], str):
            return k
    return None


def extract_topic_from_question(question_item):
    """
    Extract topic from question text using ":::" separator format.
    If question text starts with 'Topic:::', extract topic and clean the text.
    Otherwise topic = '__NO_TOPIC__'.

    Returns: (topic, copied_question_with_topic_and_clean_text)
    """
    q = question_item.copy()
    text_key = _get_question_text_key(q)

    topic = "__NO_TOPIC__"
    if text_key:
        text = q[text_key].strip()
        if ":::" in text and not text.startswith(":::"):
            # Split on first occurrence of ":::"
            parts = text.split(":::", 1)
            if len(parts) == 2:
                topic_candidate = parts[0].strip()
                question_text = parts[1].strip()
                
                if topic_candidate:  # Only if topic is not empty
                    topic = topic_candidate
                    # Update the question text to remove the topic prefix
                    q[text_key] = question_text

    q["topic"] = topic
    return topic, q


def topic_order_from_questions(questions):
    """
    Topic order is the order of first appearance in the template question list.
    """
    seen = set()
    order = []
    for item in questions:
        topic, _ = extract_topic_from_question(item)
        if topic not in seen:
            seen.add(topic)
            order.append(topic)
    return order


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

        # Check for duplicate requests
        is_duplicate, cached_response = is_duplicate_request(test_id, candidate_name)
        if is_duplicate:
            return cached_response

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
            #get current date and time and convert to IST
            indian = dateutil.tz.gettz('Asia/Kolkata')
            indian_time = datetime.now(tz=indian)
            current_time = indian_time.strftime("%Y-%m-%d %H:%M:%S")

            template_test_table.update_item(
                Key={'testID': test_id},
                UpdateExpression='SET #status = :new_status, #datetime = :new_datetime, #candidateName = :new_candidateName',
                ExpressionAttributeNames={'#status': 'status', '#datetime': 'datetime', '#candidateName': 'candidateName'},
                ExpressionAttributeValues={':new_status': status, ':new_datetime': current_time, ':new_candidateName': candidate_name}
            )

        # Fetch questions for the first template ID
        questions = getAllQuestions(template_ids[0])

        if not questions:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No questions found for templateID: {template_ids[0]}')
            }

        # Fetch all previously answered questions and their answers
        previous_answers = getAllPreviousAnswers(test_id)

        # Create set of answered question IDs for fast lookup
        answered_question_ids = set(answer['questionID'] for answer in previous_answers)
        
        # Build previous_answers dictionary
        previous_answers_dict = {}
        for answer in previous_answers:
            question_id = answer['questionID']
            previous_answers_dict[question_id] = answer.get('answer')

        # Build previous_questions list (sanitized) - only include questions that were actually answered
        previous_questions = []
        for question in questions:
            if question['questionID'] in answered_question_ids:
                topic, question_copy = extract_topic_from_question(question)
                question_copy.pop("correctAnswer", None)
                previous_questions.append(question_copy)

        # ----------------------------
        # Topic-by-topic selection with deduplication
        # ----------------------------

        # Group all questions by topic
        questions_by_topic = {}
        for q in questions:
            topic, q_with_topic = extract_topic_from_question(q)
            if topic not in questions_by_topic:
                questions_by_topic[topic] = []
            questions_by_topic[topic].append(q_with_topic)

        # Topics in order of first appearance
        topics_in_order = topic_order_from_questions(questions)

        # Find unanswered questions by topic, ensuring no repetition
        unanswered_by_topic = {}
        for topic in topics_in_order:
            if topic in questions_by_topic:
                unanswered_questions = [
                    q for q in questions_by_topic[topic] 
                    if q['questionID'] not in answered_question_ids
                ]
                if unanswered_questions:
                    unanswered_by_topic[topic] = unanswered_questions

        # Pick randomly within the first topic that still has unanswered questions
        new_question = None
        current_topic = None

        for topic in topics_in_order:
            if topic in unanswered_by_topic and unanswered_by_topic[topic]:
                current_topic = topic
                # Randomly select from unanswered questions in this topic
                available_questions = unanswered_by_topic[topic]
                new_question = random.choice(available_questions)
                break

        if new_question:
            # Remove sensitive information
            new_question.pop("correctAnswer", None)
        else:
            new_question = "No more questions available!"

        # Build previous_answers in the same order as previous_questions
        previous_answers_list = []
        for pq in previous_questions:
            previous_answers_list.append(previous_answers_dict.get(pq['questionID']))

        response_data = {
            'statusCode': 200,
            'body': json.dumps({
                'new_question': new_question,
                'previous_questions': previous_questions,
                'previous_answers': previous_answers_list,
                'question_count': len(previous_answers),
                'current_topic': current_topic,
                'total_available_questions': len(questions),
                'remaining_questions': sum(len(topic_questions) for topic_questions in unanswered_by_topic.values())
            })
        }

        # Cache this response to prevent duplicates
        cache_request_response(test_id, candidate_name, response_data)
        
        return response_data

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }
