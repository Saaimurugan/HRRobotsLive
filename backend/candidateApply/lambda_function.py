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
        cleaned = raw.strip().lstrip('```json').lstrip('```').rstrip('```').strip()
        return json.loads(cleaned)
    except Exception as e:
        print(f'run_profiler error: {e}')
        return None


def create_test_transaction(candidate_email, candidate_name, template_id):
    """Insert a row into testTransactions and return the testID."""
    test_id = str(uuid.uuid4())
    test_table.put_item(Item={
        'testID': test_id,
        'candidateName': candidate_name,
        'templateID': template_id,
        'email': candidate_email,
        'status': 'Not Started',
        'datetime': datetime.utcnow().isoformat(),
    })
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


# ── main handler ──────────────────────────────────────────────────────────────

def lambda_handler(event, context):
    try:
        # Support direct JSON body or API Gateway proxy
        if isinstance(event.get('body'), str):
            body = json.loads(event['body'])
        else:
            body = event

        action = body.get('action', 'submit')

        # ── GET apply-page metadata (template name / role) ──────────────────
        if action == 'getInfo':
            template_id = body.get('templateID', '')
            if not template_id:
                return {'statusCode': 400, 'body': json.dumps({'error': 'templateID required'})}
            try:
                resp = template_table.get_item(Key={'templateID': template_id})
                item = resp.get('Item', {})
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'templateName': item.get('templateName', 'Screening Assessment'),
                        'role': item.get('AssignedRole', ''),
                    }),
                }
            except Exception as e:
                return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

        # ── LIST submissions for a template (HR dashboard) ───────────────────
        if action == 'list':
            template_id = body.get('templateID', '')
            if not template_id:
                return {'statusCode': 400, 'body': json.dumps({'error': 'templateID required'})}
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
                return {
                    'statusCode': 200,
                    'headers': {'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'applications': items}),
                }
            except Exception as e:
                return {'statusCode': 500, 'body': json.dumps({'error': str(e)})}

        # ── SUBMIT application ────────────────────────────────────────────────
        candidate_name = body.get('candidateName', '').strip()
        candidate_email = body.get('candidateEmail', '').strip().lower()
        candidate_phone = body.get('candidatePhone', '').strip()
        template_id = body.get('templateID', '').strip()
        resume_text = body.get('resumeText', '').strip()
        # base64-encoded resume file (optional, stored as-is for record)
        resume_b64 = body.get('resumeBase64', '')

        if not all([candidate_name, candidate_email, template_id]):
            return {
                'statusCode': 400,
                'headers': {'Access-Control-Allow-Origin': '*'},
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
                    'headers': {'Access-Control-Allow-Origin': '*'},
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

        # Create test transaction → get test link
        test_id = create_test_transaction(candidate_email, candidate_name, template_id)
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
        }
        if suitability:
            application_item['suitability'] = suitability
        if profiler_result:
            application_item['profilerReport'] = json.dumps(profiler_result)
        if resume_b64:
            application_item['resumeBase64'] = resume_b64

        applications_table.put_item(Item=application_item)

        # Get template name for the email
        try:
            tmpl_resp = template_table.get_item(Key={'templateID': template_id})
            template_name = tmpl_resp.get('Item', {}).get('templateName', 'Screening Assessment')
        except Exception:
            template_name = 'Screening Assessment'

        # Send email with test link (async)
        email_body = build_test_email(candidate_name, test_link, template_name, suitability)
        send_email(
            candidate_email,
            f'Your Assessment Link — {template_name}',
            email_body,
        )

        return {
            'statusCode': 200,
            'headers': {'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json'},
            'body': json.dumps({
                'message': 'Application submitted successfully.',
                'applicationID': application_id,
                'testLink': test_link,
                'suitability': suitability,
            }),
        }

    except Exception as e:
        print(f'lambda_handler error: {e}')
        return {
            'statusCode': 500,
            'headers': {'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': str(e)}),
        }
