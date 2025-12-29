
import json
import boto3
import random
from datetime import datetime
import dateutil.tz
from boto3.dynamodb.conditions import Attr

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
questions_table = dynamodb.Table('MCQQuestions')
answers_table = dynamodb.Table('MCQAnswers')
template_test_table = dynamodb.Table('testTransactions')


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
        questions = getAllQuestions(template_ids[0])

        if not questions:
            return {
                'statusCode': 404,
                'body': json.dumps(f'No questions found for templateID: {template_ids[0]}')
            }

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
        # Topic-by-topic random picking
        # ----------------------------

        # Topics in order of first appearance
        topics_in_order = topic_order_from_questions(questions)

        # Group unanswered questions by topic
        unanswered_by_topic = {}
        for q in questions:
            if q['questionID'] in previous_answers_dict:
                continue
            topic, q_with_topic = extract_topic_from_question(q)
            unanswered_by_topic.setdefault(topic, []).append(q_with_topic)

        # Pick randomly within the first topic that still has unanswered questions
        new_question = None
        current_topic = None

        for topic in topics_in_order:
            if topic in unanswered_by_topic and unanswered_by_topic[topic]:
                current_topic = topic
                new_question = random.choice(unanswered_by_topic[topic])
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
                'current_topic': current_topic
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps(f"An error occurred: {str(e)}")
        }
