# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import re
import uuid
from datetime import datetime


def sanitize_and_parse_json(response_data):
    """
    Sanitizes AI-generated JSON and returns a valid JSON string.
    Handles common issues like trailing commas, unquoted strings, etc.
    """
    if not response_data or not isinstance(response_data, str):
        raise ValueError("Empty or invalid response data")
    
    # Extract JSON array from response (in case there's extra text)
    json_match = re.search(r'\[[\s\S]*\]', response_data)
    if not json_match:
        raise ValueError("No JSON array found in response")
    
    json_str = json_match.group(0)
    
    # Fix common JSON issues:
    # 1. Remove trailing commas before ] or }
    json_str = re.sub(r',(\s*[}\]])', r'\1', json_str)
    
    # 2. Fix unquoted string values
    json_str = re.sub(
        r'([,\[]\s*)([A-Za-z][^"\n,\]]*)"(\s*[,\]])',
        r'\1"\2"\3',
        json_str
    )
    
    # 3. Ensure all string values in arrays are properly quoted
    lines = json_str.split('\n')
    fixed_lines = []
    for line in lines:
        unquoted_match = re.match(r'^(\s*)([A-Za-z][^"]*)"(\s*,?\s*)$', line)
        if unquoted_match:
            line = f'{unquoted_match.group(1)}"{unquoted_match.group(2)}"{unquoted_match.group(3)}'
        fixed_lines.append(line)
    
    json_str = '\n'.join(fixed_lines)
    
    # Try to parse the sanitized JSON
    try:
        parsed = json.loads(json_str)
        return parsed
    except json.JSONDecodeError as e:
        # If still failing, try more aggressive fixing
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', json_str)
        
        try:
            parsed = json.loads(json_str)
            return parsed
        except json.JSONDecodeError:
            # Last resort: extract questions manually
            return extract_questions_manually(response_data)


def extract_questions_manually(response_data):
    """
    Last resort: extract question data using regex patterns when JSON parsing fails.
    """
    questions = []
    
    # Pattern to match question blocks
    pattern = r'"type"\s*:\s*"([^"]+)"[^}]*"topic"\s*:\s*"([^"]+)"[^}]*"question"\s*:\s*"([^"]+)"'
    
    matches = re.finditer(pattern, response_data, re.DOTALL)
    
    for match in matches:
        q_type, topic, question = match.groups()
        questions.append({
            "type": q_type,
            "topic": topic,
            "question": question,
            "options": [],
            "correctAnswer": ""
        })
    
    if not questions:
        raise ValueError("Could not extract any questions from response")
    
    return questions


def generate_questions_by_type(client, model_id, topic, level, question_type, count, existing_questions):
    """
    Generate questions of a specific type.
    """
    type_prompts = {
        "mcq": f"""Generate EXACTLY {count} Multiple Choice Questions (MCQ) about "{topic}" at {level} level.

Each question MUST have 4 options and one correct answer.

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "mcq",
        "topic": "{topic}",
        "question": "Your question here?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A"
    }}
]

CRITICAL: Generate EXACTLY {count} MCQ questions. No more, no less.""",

        "range": f"""Generate EXACTLY {count} Range-based questions about "{topic}" at {level} level.

Each question should ask the user to select a value from a range.

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "range",
        "topic": "{topic}",
        "question": "Rate or select a value for this question?",
        "options": "Range",
        "rangeMin": 0,
        "rangeMax": 10,
        "correctAnswer": "5",
        "anyAnswerCorrect": false
    }}
]

CRITICAL: Generate EXACTLY {count} Range questions. No more, no less.""",

        "elaborate": f"""Generate EXACTLY {count} Elaborate/Open-ended questions about "{topic}" at {level} level.

These questions should require detailed text answers.

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "elaborate",
        "topic": "{topic}",
        "question": "Explain or describe this concept in detail?",
        "options": "",
        "correctAnswer": "Expected detailed answer (optional)"
    }}
]

CRITICAL: Generate EXACTLY {count} Elaborate questions. No more, no less.""",

        "code": f"""Generate EXACTLY {count} Code/Programming questions about "{topic}" at {level} level.

These questions should require writing code as the answer.

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "code",
        "topic": "{topic}",
        "question": "Write code to solve this problem?",
        "options": "",
        "correctAnswer": "Expected code solution (optional)"
    }}
]

CRITICAL: Generate EXACTLY {count} Code questions. No more, no less."""
    }
    
    prompt = type_prompts.get(question_type, "")
    if existing_questions:
        prompt += f"\n\nDon't generate questions similar to these:\n{existing_questions}"
    
    prompt += f"\n\nReturn ONLY valid JSON array with EXACTLY {count} question objects. No additional text."
    
    message_list = [
        {
            "role": "user",
            "content": [{"text": prompt}]
        }
    ]
    
    system_list = [{"text": f"You are a JSON generator. You ONLY output valid, parseable JSON arrays with EXACTLY {count} questions. Every string value must be enclosed in double quotes."}]
    
    inf_params = {
        "max_new_tokens": 4000,
        "top_p": 0.9,
        "top_k": 20,
        "temperature": 0.7
    }
    
    request_body = {
        "schemaVersion": "messages-v1",
        "messages": message_list,
        "system": system_list,
        "inferenceConfig": inf_params,
    }
    
    response = client.invoke_model_with_response_stream(
        modelId=model_id, body=json.dumps(request_body)
    )
    
    stream = response.get("body")
    response_data = ""
    
    for event in stream:
        chunk = event.get("chunk")
        if chunk:
            chunk_json = json.loads(chunk.get("bytes").decode())
            content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
            response_data += content_block_delta
    
    return response_data


def lambda_handler(event, context):
    try:
        client = boto3.client("bedrock-runtime", region_name="us-east-1")
        LITE_MODEL_ID = "amazon.nova-micro-v1:0"

        topic = event.get('topic', '')
        level = event.get('level', '')
        formattedQuestions = event.get('formattedQuestions', '')
        questionTypes = event.get('questionTypes', {'mcq': 20, 'range': 0, 'elaborate': 0, 'code': 0})
        
        totalQuestions = sum(questionTypes.values())
        if totalQuestions == 0:
            totalQuestions = 20
            questionTypes = {'mcq': 20, 'range': 0, 'elaborate': 0, 'code': 0}

        print(f"Generating questions - Total: {totalQuestions}, Types: {questionTypes}")
        
        all_questions = []
        
        # Generate questions for each type separately
        for q_type, count in questionTypes.items():
            if count > 0:
                print(f"Generating {count} {q_type} questions...")
                try:
                    response_data = generate_questions_by_type(
                        client, LITE_MODEL_ID, topic, level, q_type, count, formattedQuestions
                    )
                    
                    print(f"Raw response for {q_type}: {response_data[:500]}")
                    
                    questions = sanitize_and_parse_json(response_data)
                    
                    # Ensure we got the right number
                    if len(questions) > count:
                        questions = questions[:count]
                    
                    all_questions.extend(questions)
                    print(f"Successfully generated {len(questions)} {q_type} questions")
                    
                except Exception as e:
                    print(f"Error generating {q_type} questions: {str(e)}")
                    # Continue with other types even if one fails
        
        if not all_questions:
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to generate any questions',
                    'details': 'All question type generations failed'
                })
            }
        
        validated_json_str = json.dumps(all_questions, ensure_ascii=False)
        
        print(f"Total questions generated: {len(all_questions)}")
   
        return {
            'statusCode': 200,
            'body': json.dumps({
                'request_id': str(uuid.uuid4()),
                'data': validated_json_str
            })
        }

    except json.JSONDecodeError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': "JSON parsing error",
                'details': str(e)
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
