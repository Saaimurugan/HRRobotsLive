import boto3
import json
import uuid
import base64
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')
bedrock_client = boto3.client('bedrock-runtime', region_name='us-east-1')

applications_table = dynamodb.Table('candidateApplications')
test_table = dynamodb.Table('testTransactions')
template_table = dynamodb.Table('template')

MODEL_ID = 'amazon.nova-lite-v1:0'


# ── Resume Parser ─────────────────────────────────────────────────────────────

def parse_resume_with_nova(resume_text):
    """
    Use Amazon Nova to extract structured information from a resume.
    Returns a dict with candidate details ready for the confirmation form.
    """
    # Increase truncation limit — most resumes fit in 12 000 chars;
    # keeping it under Nova Lite's context window.
    truncated_text = resume_text[:12000]

    prompt = f"""You are an expert resume parser. Your task is to extract ALL relevant information from the resume text below and return it as a single JSON object.

IMPORTANT PARSING RULES:
1. Extract the FULL name exactly as written — do not abbreviate.
2. Extract ALL work experience entries, even if there are many — do not skip any.
3. For each work experience, extract the FULL bullet-point description, not just 1-2 lines.
4. Extract ALL skills listed anywhere in the resume (technical skills, soft skills, tools, platforms).
5. If a field is genuinely absent, use "" or []. Never invent or hallucinate data.
6. For phone numbers, include the country code if present.
7. For LinkedIn, extract the full URL if present (e.g. linkedin.com/in/username).
8. For summary/objective, keep it to the original text — do not shorten aggressively.
9. For experience descriptions, join all bullet points with "\\n- " so each bullet is preserved.
10. For employment type (Full-time, Part-time, Contract, Internship, etc.), extract if mentioned.

Return ONLY a valid JSON object with exactly these fields:
{{
  "fullName": "candidate's full name",
  "email": "email address",
  "phone": "phone number with country code if present",
  "location": "city, state/country",
  "linkedin": "LinkedIn URL",
  "website": "personal website or portfolio URL",
  "summary": "professional summary or objective statement",
  "currentTitle": "current or most recent job title",
  "totalExperience": "total years of experience as a string e.g. '5 years'",
  "skills": ["skill1", "skill2", "skill3"],
  "experience": [
    {{
      "title": "job title",
      "company": "company name",
      "location": "city, country",
      "employmentType": "Full-time | Part-time | Contract | Internship | Freelance | etc. — or empty string",
      "duration": "e.g. Jan 2022 - Present",
      "description": "full bullet-point description joined with \\n- "
    }}
  ],
  "education": [
    {{
      "degree": "degree name and field e.g. B.Sc. Computer Science",
      "institution": "university or college name",
      "location": "city, country if available",
      "year": "graduation year or date range e.g. 2016 - 2020",
      "gpa": "GPA or grade if mentioned, else empty string"
    }}
  ],
  "certifications": ["certification name and issuer e.g. AWS Solutions Architect - Amazon"],
  "languages": ["English (Native)", "Spanish (Conversational)"],
  "achievements": "notable awards or achievements as a single string"
}}

Resume text:
{truncated_text}

Return ONLY the JSON object. No markdown fences, no extra text, no explanations."""

    try:
        request_body = {
            'schemaVersion': 'messages-v1',
            'messages': [{'role': 'user', 'content': [{'text': prompt}]}],
            'system': [{'text': 'You are a precise, thorough resume parser. Extract ALL information completely and accurately. Return only valid JSON.'}],
            'inferenceConfig': {'max_new_tokens': 4000, 'top_p': 0.9, 'top_k': 20, 'temperature': 0.1},
        }
        response = bedrock_client.invoke_model_with_response_stream(
            modelId=MODEL_ID, body=json.dumps(request_body)
        )
        raw = ''
        for chunk_event in response.get('body'):
            chunk = chunk_event.get('chunk')
            if chunk:
                chunk_json = json.loads(chunk.get('bytes').decode())
                raw += chunk_json.get('contentBlockDelta', {}).get('delta', {}).get('text', '')

        print(f'parse_resume raw response (first 500 chars): {raw[:500]}')

        cleaned = raw.strip()
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        if cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()

        # If the model wrapped the JSON in extra text, extract just the JSON object
        import re
        json_match = re.search(r'\{[\s\S]*\}', cleaned)
        if json_match:
            cleaned = json_match.group(0)

        parsed = json.loads(cleaned)

        # Normalize URLs — prepend https:// if protocol is missing
        for url_field in ('linkedin', 'website'):
            val = parsed.get(url_field, '')
            if val and not val.startswith(('http://', 'https://')):
                parsed[url_field] = 'https://' + val

        return {'success': True, 'data': parsed}
    except json.JSONDecodeError as e:
        print(f'parse_resume JSON error: {e}, raw: {raw[:300]}')
        return {'success': False, 'error': 'Failed to parse AI response', 'raw': raw[:300]}
    except Exception as e:
        print(f'parse_resume error: {e}')
        return {'success': False, 'error': str(e)}


# ── helpers ──────────────────────────────────────────────────────────────────

def get_template_jd(template_id):
    """Return the job description stored on the template, if any."""
    try:
        resp = template_table.get_item(Key={'templateID': template_id})
        item = resp.get('Item', {})
        return item.get('jobDescription', '') or item.get('AssignedRole', '')
    except Exception as e:
        print(f'get_template_jd error: {e}')
        return ''


def run_profiler(resume_text, job_description):
    """Call Nova Lite to score the resume against the JD."""
    if not resume_text or not job_description:
        return None
    prompt = f"""
You are an AI assistant tasked with analysing a candidate's resume against a job description.

Generate a JSON report with these fields:
- CandidateName: string
- Summary: string
- Suitability: percentage e.g. "78%"
- Matching: list of key matching skills
- Gaps: list of skills or experience the candidate is missing
- AdditionalStrengths: list of other strengths observed
- SuggestedImprovements: list of tips to better align with the job
- Conclusion: a concise recommendation

**Candidate Resume**:
{resume_text}

**Job Description**:
{job_description}

Return ONLY the JSON object. No markdown, no extra text.
"""
    try:
        request_body = {
            'schemaVersion': 'messages-v1',
            'messages': [{'role': 'user', 'content': [{'text': prompt}]}],
            'system': [{'text': 'You are a helpful HR assistant that evaluates resumes against job descriptions.'}],
            'inferenceConfig': {'max_new_tokens': 2000, 'top_p': 0.9, 'top_k': 20, 'temperature': 0.5},
        }
        response = bedrock_client.invoke_model_with_response_stream(
            modelId=MODEL_ID, body=json.dumps(request_body)
        )
        raw = ''
        for chunk_event in response.get('body'):
            chunk = chunk_event.get('chunk')
            if chunk:
                chunk_json = json.loads(chunk.get('bytes').decode())
                raw += chunk_json.get('contentBlockDelta', {}).get('delta', {}).get('text', '')
        cleaned = raw.strip()
        # Strip markdown code fences properly (lstrip/rstrip strip chars, not substrings)
        if cleaned.startswith('```json'):
            cleaned = cleaned[7:]
        elif cleaned.startswith('```'):
            cleaned = cleaned[3:]
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        return json.loads(cleaned)
    except Exception as e:
        print(f'run_profiler error: {e}')
        return None


def create_test_transaction(candidate_email, candidate_name, template_id, owner_email=None):
    """Insert a row into testTransactions and return the testID.

    The 'email' field is indexed by the Results page via the email-index GSI,
    so it must hold the HR owner's email (same as how createTest stores it).
    The candidate's email is stored separately as 'candidateEmail'.
    """
    test_id = str(uuid.uuid4())
    item = {
        'testID': test_id,
        'candidateName': candidate_name,
        'templateID': template_id,
        'email': owner_email if owner_email else candidate_email,
        'candidateEmail': candidate_email,
        'status': 'Not Started',
        'datetime': datetime.utcnow().isoformat(),
    }
    test_table.put_item(Item=item)
    return test_id


def send_email(recipient_email, subject, body_html):
    """Invoke the existing sendEmailSMTP Lambda."""
    try:
        lambda_client.invoke(
            FunctionName='sendEmailSMTP',
            InvocationType='Event',           # async — don't block
            Payload=json.dumps({
                'recipient_email': recipient_email,
                'subject': subject,
                'body': body_html,
            }),
        )
    except Exception as e:
        print(f'send_email error: {e}')


def build_test_email(candidate_name, test_link, template_name, suitability):
    score_section = ''
    if suitability:
        score_section = f"""
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:16px 0;">
          <p style="margin:0;color:#166534;font-size:14px;">
            <strong>Your Profile Score: {suitability}</strong> — Our AI has assessed your resume
            and you are a strong match for this role. Complete the test to proceed!
          </p>
        </div>"""
    return f"""
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f9;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.1);">
    <div style="background:#1CBBB4;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">You've Been Invited!</h1>
    </div>
    <div style="padding:28px;">
      <p>Hello <strong>{candidate_name}</strong>,</p>
      <p>Thank you for applying. Your application has been received and your resume has been reviewed.</p>
      {score_section}
      <p>You have been invited to complete a screening assessment: <strong>{template_name or 'Screening Test'}</strong>.</p>
      <div style="text-align:center;margin:24px 0;">
        <a href="{test_link}" style="background:#2563eb;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:16px;">
          Start Assessment →
        </a>
      </div>
      <p style="color:#666;font-size:13px;">If the button above does not work, copy and paste this link:<br>
        <a href="{test_link}" style="color:#2563eb;">{test_link}</a>
      </p>
      <p>Good luck!<br><strong>HR Robots Team</strong></p>
    </div>
    <div style="background:#f4f4f9;padding:12px;text-align:center;font-size:12px;color:#aaa;">
      Powered by <a href="https://www.hrrobots.click" style="color:#1CBBB4;">HR Robots</a>
    </div>
  </div>
</body></html>"""


def build_mismatch_email(candidate_name, template_name, suitability, threshold):
    """Build a polite rejection email explaining the JD mismatch."""
    score_line = f'Your resume scored <strong>{suitability}</strong> against our job requirements.' if suitability else \
                 'Our AI was unable to determine a match score for your profile.'
    return f"""
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f4f4f9;">
  <div style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 4px 10px rgba(0,0,0,.1);">
    <div style="background:#64748b;padding:24px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;">Application Received</h1>
    </div>
    <div style="padding:28px;">
      <p>Hello <strong>{candidate_name}</strong>,</p>
      <p>Thank you for your interest in the <strong>{template_name or 'position'}</strong> role and for taking the time to apply.</p>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0;">
        <p style="margin:0;color:#991b1b;font-size:14px;">
          {score_line} Unfortunately, this does not meet our current threshold of <strong>{threshold}%</strong> for this role.
        </p>
      </div>
      <p>While your application will not proceed to the assessment stage at this time, we encourage you to:</p>
      <ul style="color:#475569;font-size:14px;line-height:1.8;">
        <li>Review the job description and align your CV with the key requirements</li>
        <li>Apply again for future roles that better match your experience</li>
        <li>Keep developing the skills highlighted in the job posting</li>
      </ul>
      <p>We appreciate your interest and wish you the best in your career journey.</p>
      <p>Kind regards,<br><strong>HR Robots Team</strong></p>
    </div>
    <div style="background:#f4f4f9;padding:12px;text-align:center;font-size:12px;color:#aaa;">
      Powered by <a href="https://www.hrrobots.click" style="color:#1CBBB4;">HR Robots</a>
    </div>
  </div>
</body></html>"""


# ── main handler ──────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    try:
        # Support direct JSON body or API Gateway proxy
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event

        action = body.get('action', 'submit')

        CORS_HEADERS = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Content-Type': 'application/json',
        }

        # ── PARSE resume with Amazon Nova (step before submission) ──────────
        if action == 'parseResume':
            resume_text = body.get('resumeText', '').strip()
            if not resume_text:
                return {
                    'statusCode': 400,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'resumeText is required'}),
                }
            result = parse_resume_with_nova(resume_text)
            if result['success']:
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'parsed': result['data']}),
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': result.get('error', 'Failed to parse resume')}),
                }

        # ── SAVE job description to template table ──────────────────────────
        if action == 'saveJD':
            template_id = body.get('templateID', '')
            job_description = body.get('jobDescription', '').strip()
            if not template_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'templateID required'})}
            try:
                template_table.update_item(
                    Key={'templateID': template_id},
                    UpdateExpression='SET jobDescription = :jd',
                    ExpressionAttributeValues={':jd': job_description},
                )
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'Job description saved successfully.'}),
                }
            except Exception as e:
                print(f'saveJD error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── SAVE match threshold to template table ───────────────────────────
        if action == 'saveThreshold':
            template_id = body.get('templateID', '')
            try:
                match_threshold = int(body.get('matchThreshold', 80))
                match_threshold = max(0, min(100, match_threshold))
            except (TypeError, ValueError):
                match_threshold = 80
            if not template_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'templateID required'})}
            try:
                template_table.update_item(
                    Key={'templateID': template_id},
                    UpdateExpression='SET matchThreshold = :t',
                    ExpressionAttributeValues={':t': match_threshold},
                )
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'message': 'Match threshold saved.', 'matchThreshold': match_threshold}),
                }
            except Exception as e:
                print(f'saveThreshold error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── GET job description for a template (HR dashboard) ───────────────
        if action == 'getJD':
            template_id = body.get('templateID', '')
            if not template_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'templateID required'})}
            try:
                resp = template_table.get_item(Key={'templateID': template_id})
                item = resp.get('Item', {})
                raw_threshold = item.get('matchThreshold', 80)
                try:
                    saved_threshold = int(raw_threshold)
                except (TypeError, ValueError):
                    saved_threshold = 80
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'jobDescription': item.get('jobDescription', '') or item.get('AssignedRole', ''),
                        'templateName': item.get('templateName', ''),
                        'matchThreshold': saved_threshold,
                    }, default=str),
                }
            except Exception as e:
                print(f'getJD error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── GET apply-page metadata (template name / role) ──────────────────
        if action == 'getInfo':
            template_id = body.get('templateID', '')
            if not template_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'templateID required'})}
            try:
                resp = template_table.get_item(Key={'templateID': template_id})
                item = resp.get('Item', {})
                if not item:
                    return {
                        'statusCode': 404,
                        'headers': CORS_HEADERS,
                        'body': json.dumps({'error': 'Template not found'}),
                    }
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'templateName': item.get('templateName', 'Screening Assessment'),
                        'role': item.get('AssignedRole', ''),
                    }, default=str),
                }
            except Exception as e:
                print(f'getInfo error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── LIST submissions for a template (HR dashboard) ───────────────────
        if action == 'list':
            template_id = body.get('templateID', '')
            if not template_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'templateID required'})}
            try:
                from boto3.dynamodb.conditions import Key as DKey
                resp = applications_table.query(
                    IndexName='templateID-index',
                    KeyConditionExpression=DKey('templateID').eq(template_id),
                )
                items = resp.get('Items', [])
                # Remove large resume text from list response
                for item in items:
                    item.pop('resumeText', None)
                    item.pop('resumeBase64', None)
                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'applications': items}, default=str),
                }
            except Exception as e:
                print(f'list error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── GENERATE / REGENERATE profiler report for an existing application ──
        if action == 'generateReport':
            application_id = body.get('applicationID', '').strip()
            if not application_id:
                return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'applicationID required'})}
            try:
                # Fetch the application (needs resumeText)
                app_resp = applications_table.get_item(Key={'applicationID': application_id})
                app = app_resp.get('Item')
                if not app:
                    return {'statusCode': 404, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Application not found'})}

                resume_text_for_report = app.get('resumeText', '').strip()
                template_id_for_report = app.get('templateID', '').strip()

                if not resume_text_for_report:
                    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'No resume text stored for this application.'})}

                # Get JD from template
                job_description_for_report = get_template_jd(template_id_for_report)
                if not job_description_for_report:
                    return {'statusCode': 400, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'No job description found on this template. Please add a JD first.'})}

                # Run profiler
                result = run_profiler(resume_text_for_report, job_description_for_report)
                if not result:
                    return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': 'Profiler failed to generate a report.'})}

                suitability = result.get('Suitability', '')

                # Update the application record with the new report
                applications_table.update_item(
                    Key={'applicationID': application_id},
                    UpdateExpression='SET profilerReport = :r, suitability = :s',
                    ExpressionAttributeValues={
                        ':r': json.dumps(result),
                        ':s': suitability,
                    },
                )

                return {
                    'statusCode': 200,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({
                        'message': 'Profiler report generated successfully.',
                        'profilerReport': result,
                        'suitability': suitability,
                    }, default=str),
                }
            except Exception as e:
                print(f'generateReport error: {e}')
                return {'statusCode': 500, 'headers': CORS_HEADERS, 'body': json.dumps({'error': str(e)})}

        # ── SUBMIT application ────────────────────────────────────────────────
        candidate_name = body.get('candidateName', '').strip()
        candidate_email = body.get('candidateEmail', '').strip().lower()
        candidate_phone = body.get('candidatePhone', '').strip()
        template_id = body.get('templateID', '').strip()
        resume_text = body.get('resumeText', '').strip()
        # Truncate resumeText to prevent exceeding DynamoDB 400KB item limit
        resume_text = resume_text[:15000]
        # Structured resume data parsed by Nova (optional, from review step)
        parsed_resume = body.get('parsedResume', None)

        if not all([candidate_name, candidate_email, template_id]):
            return {
                'statusCode': 400,
                'headers': CORS_HEADERS,
                'body': json.dumps({'error': 'candidateName, candidateEmail, and templateID are required.'}),
            }

        # Prevent duplicate submissions from the same email for this template
        try:
            from boto3.dynamodb.conditions import Key as DKey, Attr
            dup_check = applications_table.query(
                IndexName='templateID-index',
                KeyConditionExpression=DKey('templateID').eq(template_id),
                FilterExpression=Attr('candidateEmail').eq(candidate_email),
            )
            if dup_check.get('Items'):
                return {
                    'statusCode': 409,
                    'headers': CORS_HEADERS,
                    'body': json.dumps({'error': 'You have already applied for this position.'}),
                }
        except Exception:
            pass  # If check fails, continue anyway

        # Run AI profiler if we have both resume text and a JD
        profiler_result = None
        suitability = None
        job_description = get_template_jd(template_id)
        if resume_text and job_description:
            profiler_result = run_profiler(resume_text, job_description)
            if profiler_result:
                suitability = profiler_result.get('Suitability', '')

        # Fetch template for name + owner email (needed before creating test transaction)
        try:
            tmpl_resp = template_table.get_item(Key={'templateID': template_id})
            tmpl_item = tmpl_resp.get('Item', {})
            template_name = tmpl_item.get('templateName', 'Screening Assessment')
            owner_email = tmpl_item.get('email', '')  # HR user who owns the template
            # Match threshold — default 80 if not configured
            try:
                match_threshold = int(tmpl_item.get('matchThreshold', 80))
            except (TypeError, ValueError):
                match_threshold = 80
        except Exception:
            template_name = 'Screening Assessment'
            owner_email = ''
            match_threshold = 80

        # Determine suitability score as an integer (0 if unavailable)
        score_num = 0
        if suitability:
            try:
                score_num = int(str(suitability).replace('%', '').strip())
            except (ValueError, TypeError):
                score_num = 0

        # A ±5% tolerance: candidate passes if score >= (threshold - 5)
        tolerance = 5
        score_meets_threshold = (not job_description) or (not suitability) or (score_num >= match_threshold - tolerance)

        # Create test transaction → get test link (always create so we have the record)
        test_id = create_test_transaction(candidate_email, candidate_name, template_id, owner_email)
        test_link = f'https://www.hrrobots.click/test/{test_id}'

        # Save application to DynamoDB
        application_id = str(uuid.uuid4())
        application_item = {
            'applicationID': application_id,
            'templateID': template_id,
            'candidateName': candidate_name,
            'candidateEmail': candidate_email,
            'candidatePhone': candidate_phone,
            'resumeText': resume_text,
            'testID': test_id,
            'testLink': test_link,
            'submittedAt': datetime.utcnow().isoformat(),
            'status': 'Applied',
            'thresholdMet': score_meets_threshold,
        }
        if suitability:
            application_item['suitability'] = suitability
        if profiler_result:
            application_item['profilerReport'] = json.dumps(profiler_result)
        # Store the parsed resume details if provided
        if parsed_resume and isinstance(parsed_resume, dict):
            application_item['parsedResume'] = json.dumps(parsed_resume)

        applications_table.put_item(Item=application_item)

        # Send appropriate email based on threshold check
        if score_meets_threshold:
            # Candidate meets (or is close to) the threshold — send the test link
            email_body = build_test_email(candidate_name, test_link, template_name, suitability)
            send_email(
                candidate_email,
                f'Your Assessment Link — {template_name}',
                email_body,
            )
        else:
            # Candidate is below threshold — send a polite mismatch email (no test link)
            email_body = build_mismatch_email(candidate_name, template_name, suitability, match_threshold)
            send_email(
                candidate_email,
                f'Your Application — {template_name}',
                email_body,
            )

        return {
            'statusCode': 200,
            'headers': CORS_HEADERS,
            'body': json.dumps({
                'message': 'Application submitted successfully.',
                'applicationID': application_id,
                'testLink': test_link if score_meets_threshold else None,
                'suitability': suitability,
                'thresholdMet': score_meets_threshold,
            }),
        }

    except Exception as e:
        print(f'lambda_handler error: {e}')
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Content-Type': 'application/json',
            },
            'body': json.dumps({'error': str(e)}),
        }
