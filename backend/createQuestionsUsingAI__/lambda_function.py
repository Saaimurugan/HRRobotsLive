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
    
    # Pattern to match complete question blocks including options
    pattern = r'"type"\s*:\s*"([^"]+)"[^}]*"topic"\s*:\s*"([^"]+)"[^}]*"question"\s*:\s*"([^"]+)"[^}]*"options"\s*:\s*(\[[^\]]*\]|"[^"]*")[^}]*"correctAnswer"\s*:\s*"([^"]*)"'
    
    matches = re.finditer(pattern, response_data, re.DOTALL)
    
    for match in matches:
        q_type, topic, question, options_str, correct_answer = match.groups()
        
        # Parse options
        options = []
        if options_str.startswith('['):
            # Try to parse as array
            try:
                options = json.loads(options_str)
            except:
                # Extract quoted strings from array
                option_matches = re.findall(r'"([^"]+)"', options_str)
                options = option_matches
        else:
            # Single string option (for range/elaborate/code types)
            options = options_str.strip('"')
        
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


def generate_mcq_questions(client, model_id, topic, level, count, existing_questions):
    """
    Generate Multiple Choice Questions (MCQ).
    """
    level_guidance = "Focus on fundamental concepts and basic understanding" if level.lower() in ["beginner", "basic", "entry"] else "Include advanced concepts and detailed technical knowledge" if level.lower() in ["advanced", "expert", "senior"] else "Balance theoretical knowledge with practical application"
    
    prompt = f"""Generate EXACTLY {count} Multiple Choice Questions (MCQ) about "{topic}" at {level} level.

REQUIREMENTS FOR MCQ QUESTIONS:
- Each question must test specific knowledge or understanding of {topic}
- Create 4 distinct, plausible options
- Only ONE option should be clearly correct
- Distractors should be reasonable but incorrect
- Questions should be clear, concise, and unambiguous
- For {level} level: {level_guidance}

CRITICAL REQUIREMENT: The "correctAnswer" field MUST be an EXACT copy of one of the options from the "options" array. 
Do NOT paraphrase or modify the text - copy it character-by-character.

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "mcq",
        "topic": "{topic}",
        "question": "Clear, specific question about {topic}?",
        "options": ["Correct answer", "Plausible distractor 1", "Plausible distractor 2", "Plausible distractor 3"],
        "correctAnswer": "Correct answer"
    }}
]

CRITICAL: 
1. Generate EXACTLY {count} MCQ questions. No more, no less.
2. The correctAnswer MUST exactly match one option from the options array.
3. Make questions challenging but fair for {level} level."""
    
    if existing_questions:
        prompt += f"\n\nDon't generate questions similar to these:\n{existing_questions}"
    
    prompt += f"\n\nReturn ONLY valid JSON array with EXACTLY {count} question objects. No additional text."
    
    return _invoke_bedrock_model(client, model_id, prompt, count)


def generate_range_questions(client, model_id, topic, level, count, existing_questions):
    """
    Generate Range-based questions.
    """
    level_guidance = "Focus on basic self-assessment and simple metrics" if level.lower() in ["beginner", "basic", "entry"] else "Include complex performance metrics and detailed evaluations" if level.lower() in ["advanced", "expert", "senior"] else "Balance subjective ratings with objective measurements"
    
    prompt = f"""Generate EXACTLY {count} Range-based questions about "{topic}" at {level} level.

REQUIREMENTS FOR RANGE QUESTIONS:
- Questions should ask for ratings, scales, or numeric values related to {topic}
- Use appropriate ranges based on the context (e.g., 1-5 for ratings, 0-100 for percentages)
- Questions can assess experience levels, confidence, or quantitative aspects
- For {level} level: {level_guidance}
- Set realistic min/max values and appropriate default answers
- Consider whether any answer should be marked as correct or if it's purely subjective

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "range",
        "topic": "{topic}",
        "question": "Rate your experience/confidence/knowledge in this aspect of {topic}?",
        "options": "Range",
        "rangeMin": 1,
        "rangeMax": 10,
        "correctAnswer": "5",
        "anyAnswerCorrect": true
    }}
]

CRITICAL: Generate EXACTLY {count} Range questions. No more, no less."""
    
    if existing_questions:
        prompt += f"\n\nDon't generate questions similar to these:\n{existing_questions}"
    
    prompt += f"\n\nReturn ONLY valid JSON array with EXACTLY {count} question objects. No additional text."
    
    return _invoke_bedrock_model(client, model_id, prompt, count)


def generate_elaborate_questions(client, model_id, topic, level, count, existing_questions):
    """
    Generate Elaborate/Open-ended questions.
    """
    level_guidance = "Focus on basic explanations and simple examples" if level.lower() in ["beginner", "basic", "entry"] else "Require complex analysis, system design, and advanced problem-solving" if level.lower() in ["advanced", "expert", "senior"] else "Balance conceptual understanding with practical implementation details"
    
    prompt = f"""Generate EXACTLY {count} Elaborate/Open-ended questions about "{topic}" at {level} level.

REQUIREMENTS FOR ELABORATE QUESTIONS:
- Questions should require detailed, thoughtful responses (2-5 sentences minimum)
- Test deep understanding, critical thinking, and practical application
- Encourage candidates to demonstrate their knowledge through explanation
- Questions should be specific enough to guide the response but open enough for creativity
- For {level} level: {level_guidance}
- Include scenario-based questions when appropriate
- Ask for examples, comparisons, or step-by-step explanations

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "elaborate",
        "topic": "{topic}",
        "question": "Explain in detail how you would approach/implement/solve this {topic}-related scenario. Provide specific examples and reasoning.",
        "options": "",
        "correctAnswer": "Sample comprehensive answer demonstrating expected depth and key points"
    }}
]

CRITICAL: Generate EXACTLY {count} Elaborate questions. No more, no less."""
    
    if existing_questions:
        prompt += f"\n\nDon't generate questions similar to these:\n{existing_questions}"
    
    prompt += f"\n\nReturn ONLY valid JSON array with EXACTLY {count} question objects. No additional text."
    
    return _invoke_bedrock_model(client, model_id, prompt, count)


def generate_code_questions(client, model_id, topic, level, count, existing_questions):
    """
    Generate Code/Programming questions.
    """
    level_guidance = "Focus on basic syntax, simple algorithms, and fundamental programming concepts" if level.lower() in ["beginner", "basic", "entry"] else "Include complex algorithms, system design, optimization, and advanced patterns" if level.lower() in ["advanced", "expert", "senior"] else "Balance problem-solving skills with clean, efficient code implementation"
    
    prompt = f"""Generate EXACTLY {count} Code/Programming questions about "{topic}" at {level} level.

REQUIREMENTS FOR CODE QUESTIONS:
- Questions should require writing actual code as the solution
- Specify the programming language when relevant to {topic}
- Include clear problem statements with input/output examples when applicable
- Test practical coding skills, not just theoretical knowledge
- For {level} level: {level_guidance}
- Questions can include: algorithm implementation, debugging, code completion, or system design
- Provide context about constraints, expected complexity, or specific requirements

Return ONLY a JSON array with {count} objects:
[
    {{
        "type": "code",
        "topic": "{topic}",
        "question": "Write code to solve this {topic}-related problem: [Clear problem description with examples]",
        "options": "",
        "correctAnswer": "// Sample solution with comments explaining the approach\\nfunction sampleSolution() {{\\n    // Implementation here\\n    return result;\\n}}"
    }}
]

CRITICAL: Generate EXACTLY {count} Code questions. No more, no less."""
    
    if existing_questions:
        prompt += f"\n\nDon't generate questions similar to these:\n{existing_questions}"
    
    prompt += f"\n\nReturn ONLY valid JSON array with EXACTLY {count} question objects. No additional text."
    
    return _invoke_bedrock_model(client, model_id, prompt, count)


def _invoke_bedrock_model(client, model_id, prompt, count):
    """
    Helper function to invoke the Bedrock model with the given prompt.
    """
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


def generate_questions_by_type(client, model_id, topic, level, question_type, count, existing_questions):
    """
    Generate questions of a specific type by calling the appropriate specialized function.
    """
    type_functions = {
        "mcq": generate_mcq_questions,
        "range": generate_range_questions,
        "elaborate": generate_elaborate_questions,
        "code": generate_code_questions
    }
    
    generator_function = type_functions.get(question_type)
    if not generator_function:
        raise ValueError(f"Unknown question type: {question_type}")
    
    return generator_function(client, model_id, topic, level, count, existing_questions)


def validate_and_fix_mcq_answers(questions):
    """
    Validates that MCQ correct answers exactly match one of the options.
    If not, finds the closest match or defaults to the first option.
    Also ensures MCQ questions have valid options arrays.
    """
    fixed_questions = []
    
    for q in questions:
        if q.get('type') == 'mcq':
            options = q.get('options', [])
            correct_answer = q.get('correctAnswer', '')
            
            # CRITICAL: Validate that MCQ has options
            if not options or not isinstance(options, list) or len(options) < 2:
                print(f"ERROR: MCQ question has invalid or missing options: {q.get('question', 'Unknown')[:100]}")
                print(f"Options received: {options}")
                # Skip this question - it's invalid
                continue
            
            # Check if correct answer exactly matches an option
            if correct_answer in options:
                fixed_questions.append(q)
                continue
            
            # Try to find a close match (case-insensitive, trimmed)
            correct_answer_normalized = correct_answer.strip().lower()
            matched = False
            
            for option in options:
                if option.strip().lower() == correct_answer_normalized:
                    # Found a match - update to exact option text
                    q['correctAnswer'] = option
                    matched = True
                    print(f"Fixed MCQ answer: '{correct_answer}' -> '{option}'")
                    break
            
            # If still no match, try partial matching
            if not matched:
                for option in options:
                    if correct_answer_normalized in option.strip().lower() or option.strip().lower() in correct_answer_normalized:
                        q['correctAnswer'] = option
                        matched = True
                        print(f"Fixed MCQ answer (partial match): '{correct_answer}' -> '{option}'")
                        break
            
            # Last resort: default to first option
            if not matched and options:
                print(f"WARNING: Could not match '{correct_answer}' to any option. Defaulting to first option: '{options[0]}'")
                q['correctAnswer'] = options[0]
            
            fixed_questions.append(q)
        else:
            # Non-MCQ questions don't need validation
            fixed_questions.append(q)
    
    return fixed_questions


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
                    
                    # Validate MCQ questions have options
                    if q_type == 'mcq':
                        valid_questions = []
                        for q in questions:
                            if q.get('options') and isinstance(q.get('options'), list) and len(q.get('options')) >= 2:
                                valid_questions.append(q)
                            else:
                                print(f"WARNING: Skipping MCQ without valid options: {q.get('question', 'Unknown')[:100]}")
                        questions = valid_questions
                    
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
        
        # Validate and fix MCQ answers to ensure they match options exactly
        all_questions = validate_and_fix_mcq_answers(all_questions)
        
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
