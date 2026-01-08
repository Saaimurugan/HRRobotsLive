
import json
import boto3
import random
from datetime import datetime
import dateutil.tz
from boto3.dynamodb.conditions import Attr, Key

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')
config_table = dynamodb.Table('testConfiguration')


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
    Adjust this if you know your schema for sure.
    """
    for k in ("question", "questionText", "text", "prompt"):
        if k in q and isinstance(q[k], str):
            return k
    return None


def extract_topic_from_question(question_item):
    """
    If question text starts with 'Topic:::', extract topic and remove the prefix.
    Otherwise topic = '__NO_TOPIC__'.

    Returns: (topic, copied_question_with_topic_and_clean_text)
    """
    q = question_item.copy()
    text_key = _get_question_text_key(q)

    topic = "__NO_TOPIC__"
    if text_key:
        text = q[text_key].strip()
        if text.startswith(":::"):
            # Edge case: malformed, keep as NO_TOPIC
            pass
        elif ":::" in text:
            # Only treat as topic if it's at the start: "<TOPIC>::: rest..."
            left, right = text.split(":::", 1)
            if text.startswith(left):  # always true, but keeps intent explicit
                topic_candidate = left.strip()
                if topic_candidate and text.startswith(topic_candidate + ":::"):
                    topic = topic_candidate
                    q[text_key] = left.lstrip() + ":::" + right.lstrip()

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
        template_id = template_ids[0]
        questions = getAllQuestions(template_id)

        if not questions:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No questions found for templateID: {template_id}')
            }

        # Fetch test configuration to get numberOfQuestions
        config_response = config_table.query(
            KeyConditionExpression=Key('testConfigurationID').eq(template_id)
        )
        config_items = config_response.get('Items', [])
        
        # Default to 50 if no configuration found
        if config_items:
            num_questions_for_test = int(config_items[0].get('numberOfQuestions', 50))
        else:
            num_questions_for_test = 50

        # Fetch all previously answered questions and their answers
        previous_answers = getAllPreviousAnswers(test_id)

        previous_answers_dict = {}
        for answer in previous_answers:
            question_id = answer['questionID']
            previous_answers_dict[question_id] = answer.get('answer')

        # Build previous_questions list (sanitized)
        previous_questions = []
        for question in questions:
            if question['questionID'] in previous_answers_dict:
                topic, question_copy = extract_topic_from_question(question)
                question_copy.pop("correctAnswer", None)
                previous_questions.append(question_copy)

        # ----------------------------
        # Proportional topic allocation with grouped delivery
        # Questions are picked proportionally per topic, but delivered topic-by-topic
        # ----------------------------

        # Topics in order of first appearance
        topics_in_order = topic_order_from_questions(questions)

        # Group ALL questions by topic (for calculating proportions)
        all_by_topic = {}
        for q in questions:
            topic, q_with_topic = extract_topic_from_question(q)
            all_by_topic.setdefault(topic, []).append(q_with_topic)

        # Group unanswered questions by topic
        unanswered_by_topic = {}
        for q in questions:
            if q['questionID'] in previous_answers_dict:
                continue
            topic, q_with_topic = extract_topic_from_question(q)
            unanswered_by_topic.setdefault(topic, []).append(q_with_topic)

        # Count answered questions per topic
        answered_by_topic = {}
        for q in questions:
            if q['questionID'] in previous_answers_dict:
                topic, _ = extract_topic_from_question(q)
                answered_by_topic[topic] = answered_by_topic.get(topic, 0) + 1

        # Calculate total questions available
        total_questions = len(questions)
        total_answered = len(previous_answers_dict)

        # Use configured numberOfQuestions for the test (capped by available questions)
        test_question_count = min(num_questions_for_test, total_questions)

        # Calculate proportional quota for each topic based on weighted average
        # Quota = (topic_questions / total_questions) * test_question_count
        # Ensure each topic gets at least 1 question if it has questions available
        topic_quota = {}
        total_quota_assigned = 0
        num_topics = len(topics_in_order)
        
        for topic in topics_in_order:
            topic_total = len(all_by_topic.get(topic, []))
            # Proportional share of questions for this topic
            proportion = topic_total / total_questions if total_questions > 0 else 0
            # Quota is proportional to test question count
            raw_quota = proportion * test_question_count
            # Ensure at least 1 question per topic (if we have enough questions)
            quota = max(1, round(raw_quota)) if topic_total > 0 and test_question_count >= num_topics else round(raw_quota)
            # But don't exceed available questions for this topic
            quota = min(quota, topic_total)
            topic_quota[topic] = quota
            total_quota_assigned += quota
        
        # Adjust if we over-allocated due to rounding up
        while total_quota_assigned > test_question_count:
            # Reduce from topic with highest quota that's above its proportion
            for topic in sorted(topics_in_order, key=lambda t: topic_quota[t], reverse=True):
                if topic_quota[topic] > 1:
                    topic_quota[topic] -= 1
                    total_quota_assigned -= 1
                    break
        
        # Handle under-allocation - distribute remaining to topics with available questions
        while total_quota_assigned < test_question_count:
            added = False
            for topic in topics_in_order:
                topic_total = len(all_by_topic.get(topic, []))
                if topic_quota[topic] < topic_total:
                    topic_quota[topic] += 1
                    total_quota_assigned += 1
                    added = True
                    if total_quota_assigned >= test_question_count:
                        break
            if not added:
                break  # No more questions available

        # Determine which topic to pick from:
        # Go through topics in order, pick from current topic until its quota is met
        new_question = None
        current_topic = None

        for topic in topics_in_order:
            topic_answered_count = answered_by_topic.get(topic, 0)
            quota = topic_quota.get(topic, 0)
            unanswered = unanswered_by_topic.get(topic, [])
            
            # If this topic hasn't reached its quota and has unanswered questions
            if topic_answered_count < quota and unanswered:
                current_topic = topic
                new_question = random.choice(unanswered)
                break
        
        # If all topics have met their quota but there are still unanswered questions,
        # pick from any remaining (handles rounding edge cases)
        if new_question is None:
            for topic in topics_in_order:
                unanswered = unanswered_by_topic.get(topic, [])
                if unanswered:
                    current_topic = topic
                    new_question = random.choice(unanswered)
                    break

        if new_question:
            new_question.pop("correctAnswer", None)
        else:
            new_question = "No more questions available!"

        # Build previous_answers in the same order as previous_questions
        previous_answers_list = []
        for pq in previous_questions:
            previous_answers_list.append(previous_answers_dict.get(pq['questionID']))

        return {
            'statusCode': 200,
            'body': json.dumps({
                'new_question': new_question,
                'previous_questions': previous_questions,
                'previous_answers': previous_answers_list,
                'question_count': len(previous_answers),
                'current_topic': current_topic,
                'topic_quota': topic_quota,
                'answered_by_topic': answered_by_topic
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }
