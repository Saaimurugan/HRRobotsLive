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
    
    # 2. Fix unquoted string values (e.g., All of the above" -> "All of the above")
    # This pattern finds lines where a value starts without a quote but ends with one
    json_str = re.sub(
        r'([,\[]\s*)([A-Za-z][^"\n,\]]*)"(\s*[,\]])',
        r'\1"\2"\3',
        json_str
    )
    
    # 3. Ensure all string values in arrays are properly quoted
    # Process line by line for better control
    lines = json_str.split('\n')
    fixed_lines = []
    for line in lines:
        # Check for unquoted array elements (common AI mistake)
        # Pattern: whitespace + unquoted text + ending quote
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
        # Remove any non-printable characters except newlines/tabs
        json_str = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', json_str)
        
        # Try parsing again
        try:
            parsed = json.loads(json_str)
            return parsed
        except json.JSONDecodeError:
            # Last resort: extract questions manually using regex
            return extract_questions_manually(response_data)


def extract_questions_manually(response_data):
    """
    Last resort: extract question data using regex patterns when JSON parsing fails.
    Updated to include topic field.
    """
    questions = []
    
    # Pattern to match question blocks with topic field
    pattern = r'"type"\s*:\s*"([^"]+)"[^}]*"topic"\s*:\s*"([^"]+)"[^}]*"question"\s*:\s*"([^"]+)"[^}]*"options"\s*:\s*\[(.*?)\][^}]*"correctAnswer"\s*:\s*"([^"]+)"'
    
    matches = re.finditer(pattern, response_data, re.DOTALL)
    
    for match in matches:
        q_type, topic, question, options_str, correct_answer = match.groups()
        
        # Extract options
        options = re.findall(r'"([^"]+)"', options_str)
        
        if options:
            questions.append({
                "type": q_type,
                "topic": topic,
                "question": question,
                "options": options,
                "correctAnswer": correct_answer
            })
    
    if not questions:
        raise ValueError("Could not extract any questions from response")
    
    return questions


def lambda_handler(event, context):
    try:
        # Create a Bedrock Runtime client in the AWS Region of your choice.
        client = boto3.client("bedrock-runtime", region_name="us-east-1")

        LITE_MODEL_ID = "amazon.nova-micro-v1:0"

        topic = event.get('topic', '')
        level = event.get('level', '')
        formattedQuestions = event.get('formattedQuestions', '')

        # Define system prompt with stricter JSON instructions and topic field
        message_list = [
            {
                "role": "user",
                "content": [{
                    "text": f"""Generate 20 MCQs with answers related to the topic: "{topic}".

Level: {level}

Don't generate the questions below:
{formattedQuestions}

IMPORTANT: Return ONLY valid JSON. Every string value MUST be enclosed in double quotes.

Return the response in this exact JSON format with topic field:
[
    {{
        "type": "mcq",
        "topic": "{topic}",
        "question": "Your question here?",
        "options": [
            "Option A",
            "Option B", 
            "Option C",
            "Option D"
        ],
        "correctAnswer": "Option A"
    }}
]

Rules:
- All string values must be in double quotes
- Include the topic field with the exact topic provided: "{topic}"
- No trailing commas after the last item in arrays or objects
- Escape special characters properly (use \\" for quotes inside strings)
- Return ONLY the JSON array, no additional text"""
                }]
            }
        ]

        system_list = [{"text": "You are a JSON generator. You ONLY output valid, parseable JSON arrays. Every string value must be enclosed in double quotes. Never output malformed JSON."}]

        # Configure inference parameters
        inf_params = {
            "max_new_tokens": 6000,
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

        start_time = datetime.now()

        # Invoke the model with response stream
        response = client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID, body=json.dumps(request_body)
        )

        request_id = response.get("ResponseMetadata", {}).get("RequestId", "N/A")
        stream = response.get("body")

        if not stream:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Response not received, please contact support.',
                    'request_id': request_id
                })
            }

        # Collect response chunks
        response_data = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta

        # Debugging: Log raw response data
        print(f"Raw Response Data: {response_data}")
        
        # Sanitize and validate the JSON response
        try:
            validated_questions = sanitize_and_parse_json(response_data)
            
            # Return the validated JSON as a properly formatted string
            validated_json_str = json.dumps(validated_questions, ensure_ascii=False)
        except (ValueError, json.JSONDecodeError) as parse_error:
            print(f"JSON parsing/sanitization failed: {str(parse_error)}")
            print(f"Problematic response: {response_data[:1000]}")
            return {
                'statusCode': 500,
                'body': json.dumps({
                    'error': 'Failed to generate valid questions. Please try again.',
                    'details': str(parse_error),
                    'request_id': request_id
                })
            }
   
        return {
            'statusCode': 200,
            'body': json.dumps({
                'request_id': request_id,
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