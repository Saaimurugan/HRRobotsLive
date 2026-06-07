# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import re
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
            return extract_questions_manually(response_data)


def extract_questions_manually(response_data):
    """
    Last resort: extract question data using regex patterns when JSON parsing fails.
    """
    questions = []
    
    pattern = r'"type"\s*:\s*"([^"]+)"[^}]*"topic"\s*:\s*"([^"]+)"[^}]*"question"\s*:\s*"([^"]+)"[^}]*"options"\s*:\s*\[(.*?)\][^}]*"correctAnswer"\s*:\s*"([^"]+)"'
    
    matches = re.finditer(pattern, response_data, re.DOTALL)
    
    for match in matches:
        q_type, topic, question, options_str, correct_answer = match.groups()
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


def extract_projects_from_resume(resume_text):
    """
    Extract project information from resume text using AI.
    Returns a structured list of projects with descriptions.
    """
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    LITE_MODEL_ID = "amazon.nova-micro-v1:0"

    # Truncate resume if too long to avoid token limits
    max_resume_length = 3000
    if len(resume_text) > max_resume_length:
        resume_text = resume_text[:max_resume_length]

    message_list = [
        {
            "role": "user",
            "content": [{
                "text": f"""Extract all projects, work experience, and job roles from this resume. Return as JSON array.

Resume Text:
{resume_text}

Extract information about:
1. Job titles and companies
2. Projects worked on
3. Technologies and tools used
4. Key accomplishments and results

Return ONLY valid JSON array in this exact format:
[
    {{
        "title": "Job Title or Project Name",
        "description": "What was accomplished",
        "technologies": ["tech1", "tech2"],
        "achievements": ["result1", "result2"]
    }}
]

IMPORTANT RULES:
- Extract at least 2-3 items if available
- Each item must have title, description, technologies array, and achievements array
- All arrays must have at least 1 item
- All string values MUST be in double quotes
- No trailing commas
- No extra text before or after JSON
- Return ONLY the JSON array"""
            }]
        }
    ]

    system_list = [{"text": "You are a JSON generator. Output ONLY valid JSON arrays. Every string must be in double quotes. No markdown, no explanations, just JSON."}]

    inf_params = {
        "max_new_tokens": 3000,
        "top_p": 0.9,
        "top_k": 20,
        "temperature": 0.5
    }

    request_body = {
        "schemaVersion": "messages-v1",
        "messages": message_list,
        "system": system_list,
        "inferenceConfig": inf_params,
    }

    try:
        print("Starting project extraction from resume...")
        response = client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID, body=json.dumps(request_body)
        )

        stream = response.get("body")
        response_data = ""
        
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta

        print(f"Raw projects extraction response: {response_data[:500]}")
        
        if not response_data or not response_data.strip():
            print("Empty response from project extraction")
            return create_fallback_projects(resume_text)
        
        projects = sanitize_and_parse_json(response_data)
        
        if not isinstance(projects, list):
            print(f"Projects is not a list: {type(projects)}")
            return create_fallback_projects(resume_text)
        
        if len(projects) == 0:
            print("No projects extracted, using fallback")
            return create_fallback_projects(resume_text)
        
        print(f"Successfully extracted {len(projects)} projects")
        return projects
    
    except Exception as e:
        print(f"Error extracting projects: {str(e)}")
        print("Using fallback project extraction")
        return create_fallback_projects(resume_text)


def create_fallback_projects(resume_text):
    """
    Create fallback projects by parsing resume text with regex.
    """
    projects = []
    
    # Look for common job/project patterns
    lines = resume_text.split('\n')
    current_project = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Look for lines that might be job titles or project names (usually capitalized, shorter)
        if len(line) < 100 and line[0].isupper() and any(keyword in line.lower() for keyword in ['engineer', 'developer', 'project', 'manager', 'lead', 'specialist', 'analyst']):
            if current_project:
                projects.append(current_project)
            current_project = {
                "title": line[:80],
                "description": "",
                "technologies": [],
                "achievements": []
            }
        elif current_project and line:
            # Add to description or extract technologies
            if any(tech in line.lower() for tech in ['python', 'java', 'javascript', 'react', 'node', 'aws', 'sql', 'api', 'database', 'cloud', 'docker', 'kubernetes']):
                # Extract technologies
                techs = re.findall(r'\b(Python|Java|JavaScript|React|Node|AWS|SQL|Docker|Kubernetes|C\+\+|C#|Go|Rust|TypeScript|Vue|Angular|Django|Flask|Spring|MongoDB|PostgreSQL|MySQL|Redis|Elasticsearch|Kafka|Spark|Hadoop)\b', line, re.IGNORECASE)
                current_project["technologies"].extend(techs)
            else:
                # Add to description
                if len(current_project["description"]) < 200:
                    current_project["description"] += " " + line
            
            # Look for achievement indicators
            if any(indicator in line.lower() for indicator in ['improved', 'increased', 'reduced', 'optimized', 'implemented', 'developed', 'created', 'built', 'achieved', 'delivered']):
                current_project["achievements"].append(line[:100])
    
    if current_project:
        projects.append(current_project)
    
    # Ensure we have at least some projects
    if not projects:
        projects = [{
            "title": "Work Experience",
            "description": resume_text[:200],
            "technologies": ["General"],
            "achievements": ["Professional experience"]
        }]
    
    # Clean up projects
    for project in projects:
        if not project["technologies"]:
            project["technologies"] = ["General"]
        if not project["achievements"]:
            project["achievements"] = ["Contributed to project"]
        project["description"] = project["description"].strip()[:200] or "Professional experience"
    
    print(f"Created {len(projects)} fallback projects")
    return projects


def generate_scenario_based_questions(project, skill, level, existing_questions=""):
    """
    Generate scenario-based questions for a specific project and skill.
    """
    client = boto3.client("bedrock-runtime", region_name="us-east-1")
    LITE_MODEL_ID = "amazon.nova-micro-v1:0"

    project_desc = project.get('description', '')[:300]
    technologies = ', '.join(project.get('technologies', [])[:5])
    achievements = ', '.join(project.get('achievements', [])[:3])

    message_list = [
        {
            "role": "user",
            "content": [{
                "text": f"""Generate 3 scenario-based MCQ questions based on this project experience.

Project: {project.get('title', 'Project')[:100]}
Description: {project_desc}
Technologies: {technologies}
Achievements: {achievements}
Skill: {skill}
Level: {level}

Create realistic scenario questions that test practical knowledge.

Return ONLY valid JSON array:
[
    {{
        "type": "mcq",
        "topic": "{skill}",
        "question": "Scenario-based question?",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A"
    }}
]

CRITICAL RULES:
- Create 3 practical scenario questions
- All strings in double quotes
- No trailing commas
- The "correctAnswer" field MUST be an EXACT copy of one option from the "options" array
- Do NOT paraphrase the correct answer - copy it character-by-character
- Return ONLY JSON array"""
            }]
        }
    ]

    system_list = [{"text": "You are a JSON generator. Output ONLY valid JSON. No markdown, no text, just JSON array."}]

    inf_params = {
        "max_new_tokens": 2000,
        "top_p": 0.9,
        "top_k": 20,
        "temperature": 0.6
    }

    request_body = {
        "schemaVersion": "messages-v1",
        "messages": message_list,
        "system": system_list,
        "inferenceConfig": inf_params,
    }

    try:
        print(f"Generating scenario questions for {skill} from project {project.get('title', 'Unknown')}")
        response = client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID, body=json.dumps(request_body)
        )

        stream = response.get("body")
        response_data = ""
        
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta

        print(f"Scenario response (first 300 chars): {response_data[:300]}")
        
        if not response_data or not response_data.strip():
            print("Empty response, creating fallback questions")
            return create_fallback_scenario_questions(project, skill)
        
        questions = sanitize_and_parse_json(response_data)
        
        if not isinstance(questions, list):
            print(f"Questions is not a list: {type(questions)}")
            return create_fallback_scenario_questions(project, skill)
        
        if len(questions) == 0:
            print("No questions generated, using fallback")
            return create_fallback_scenario_questions(project, skill)
        
        print(f"Generated {len(questions)} scenario questions")
        return questions
    
    except Exception as e:
        print(f"Error generating scenario questions: {str(e)}")
        return create_fallback_scenario_questions(project, skill)


def create_fallback_scenario_questions(project, skill):
    """
    Create fallback scenario-based questions when AI generation fails.
    """
    project_title = project.get('title', 'Project')[:50]
    technologies = project.get('technologies', ['technology'])
    achievements = project.get('achievements', ['completed task'])
    
    questions = [
        {
            "type": "mcq",
            "topic": skill,
            "question": f"In the {project_title} project, which approach would be most effective for {skill}?",
            "options": [
                f"Use best practices for {skill}",
                f"Implement {skill} with {technologies[0] if technologies else 'available tools'}",
                f"Optimize {skill} performance",
                f"All of the above"
            ],
            "correctAnswer": "All of the above"
        },
        {
            "type": "mcq",
            "topic": skill,
            "question": f"When working on {project_title}, how would you apply {skill} to achieve: {achievements[0] if achievements else 'project goals'}?",
            "options": [
                f"By leveraging {technologies[0] if technologies else 'available resources'}",
                f"Through systematic implementation",
                f"By following industry standards",
                f"All of the above"
            ],
            "correctAnswer": "All of the above"
        },
        {
            "type": "mcq",
            "topic": skill,
            "question": f"What is a key consideration for {skill} in a project like {project_title}?",
            "options": [
                "Performance optimization",
                "Code quality and maintainability",
                "Scalability and reliability",
                "All of the above"
            ],
            "correctAnswer": "All of the above"
        }
    ]
    
    print(f"Created {len(questions)} fallback scenario questions")
    return questions


def validate_and_fix_mcq_answers(questions):
    """
    Validates that MCQ correct answers exactly match one of the options.
    If not, finds the closest match or defaults to the first option.
    """
    fixed_questions = []
    
    for q in questions:
        if q.get('type') == 'mcq':
            options = q.get('options', [])
            correct_answer = q.get('correctAnswer', '')
            
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
        resume_text = event.get('resumeText', '')
        skills = event.get('skills', [])
        level = event.get('level', 'intermediate')
        existing_questions = event.get('existingQuestions', '')

        print(f"Received request with {len(skills)} skills and resume length: {len(resume_text)}")

        if not resume_text or len(resume_text.strip()) < 50:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Resume text is too short or empty. Please provide a detailed resume.'
                })
            }

        if not skills or len(skills) == 0:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'At least one skill is required'
                })
            }

        # Step 1: Extract projects from resume
        print("Step 1: Extracting projects from resume...")
        projects = extract_projects_from_resume(resume_text)
        
        if not projects or len(projects) == 0:
            print("No projects extracted")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Could not extract projects from resume. Please ensure your resume contains detailed project descriptions.'
                })
            }

        print(f"Step 1 Complete: Extracted {len(projects)} projects")

        # Step 2: Generate scenario-based questions for each skill using projects
        print("Step 2: Generating scenario-based questions...")
        all_questions = []
        generated_questions_text = existing_questions

        for skill in skills:
            print(f"Generating questions for skill: {skill}")
            skill_questions = []
            
            # Generate questions for each project (limit to first 3 projects to save time)
            for idx, project in enumerate(projects[:3]):
                print(f"  Processing project {idx + 1}: {project.get('title', 'Unknown')}")
                project_questions = generate_scenario_based_questions(
                    project, 
                    skill, 
                    level, 
                    generated_questions_text
                )
                
                if project_questions and len(project_questions) > 0:
                    skill_questions.extend(project_questions)
                    # Update the existing questions text to avoid duplicates
                    generated_questions_text += "\n" + "\n".join([q.get('question', '') for q in project_questions])
                    print(f"  Generated {len(project_questions)} questions for this project")
            
            all_questions.extend(skill_questions)
            print(f"Total questions for {skill}: {len(skill_questions)}")

        if not all_questions or len(all_questions) == 0:
            print("No questions generated, returning error")
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'error': 'Could not generate scenario-based questions. Please try again.'
                })
            }

        print(f"Step 2 Complete: Generated {len(all_questions)} total questions")

        # Validate and fix MCQ answers to ensure they match options exactly
        all_questions = validate_and_fix_mcq_answers(all_questions)

        # Return the generated questions
        return {
            'statusCode': 200,
            'body': json.dumps({
                'projects': projects,
                'questions': all_questions,
                'totalQuestions': len(all_questions),
                'message': f'Generated {len(all_questions)} scenario-based questions from {len(projects)} projects'
            })
        }

    except Exception as e:
        print(f"Error in lambda_handler: {str(e)}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': f'Internal server error: {str(e)}'
            })
        }
