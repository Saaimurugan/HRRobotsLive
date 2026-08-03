import boto3
import json
import uuid
from datetime import datetime


# DynamoDB table for storing resume data
dynamodb = boto3.resource('dynamodb')
resume_table = dynamodb.Table('resumeData')

# Bedrock client
bedrock_client = boto3.client("bedrock-runtime", region_name="us-east-1")
MODEL_ID = "amazon.nova-lite-v1:0"


DESIGN_PROMPTS = {
    "classic": """
Generate a classic, ATS-friendly resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #374151; line-height: 1.5; max-width: 780px; margin: 0 auto; padding: 32px 40px; background: #ffffff;">

Name & Contact Header:
- Name: <h1 style="font-size: 22pt; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; letter-spacing: -0.3px;">
- Title/tagline: <p style="font-size: 11pt; color: #64748b; margin: 0 0 8px 0;">
- Contact line: <p style="font-size: 9.5pt; color: #64748b; margin: 0;">  (email · phone · location · linkedin · website separated by " · ")
- Full-width horizontal rule: <hr style="border: none; border-top: 1.5px solid #1e293b; margin: 12px 0 16px 0;">

Section headers:
<h2 style="font-size: 10.5pt; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em; margin: 18px 0 4px 0; padding-bottom: 3px; border-bottom: 1px solid #2563eb;">

Job entry title line:
<div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 2px;">
  <strong style="font-size: 11pt; color: #1e293b;">JOB TITLE</strong>
  <span style="font-size: 9.5pt; color: #64748b;">START – END</span>
</div>
<div style="font-size: 10pt; color: #64748b; margin-bottom: 4px;">Company · Location</div>

Bullet points: <ul style="margin: 4px 0 10px 18px; padding: 0;"> with <li style="margin-bottom: 3px; color: #374151;">

Education entry: same title-line pattern as job entries.

Skills: <p style="margin: 4px 0; color: #374151;"> (comma-separated)

Close outer div at the end.
""",

    "modern": """
Generate a modern two-column resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper (flex row):
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 10.5pt; color: #374151; line-height: 1.5; max-width: 780px; margin: 0 auto; display: flex; min-height: 900px; background: #ffffff;">

Left sidebar (38% width, dark navy background):
<div style="width: 38%; background: #1e3a5f; color: #e2e8f0; padding: 28px 20px; box-sizing: border-box;">
  - Name: <h1 style="font-size: 16pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; line-height: 1.2;">
  - Job title: <p style="font-size: 9.5pt; color: #93c5fd; margin: 0 0 16px 0;">
  - Divider: <hr style="border: none; border-top: 1px solid #3b82f6; margin: 0 0 16px 0; opacity: 0.5;">
  Sidebar section headers: <h3 style="font-size: 8.5pt; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.1em; margin: 16px 0 8px 0;">
  Contact items: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0;">
  Skill items: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0; padding-left: 8px; border-left: 2px solid #3b82f6;">
  Certifications / Languages: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0;">
</div>

Right content (62% width):
<div style="width: 62%; padding: 28px 28px 28px 24px; box-sizing: border-box;">
  Section headers: <h2 style="font-size: 10pt; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0; padding-bottom: 3px; border-bottom: 1.5px solid #2563eb;">
  First section has margin-top: 0; subsequent sections margin-top: 18px.
  Job title line: flex row justify-content space-between.
  <strong style="font-size: 10.5pt; color: #1e293b;">TITLE</strong>  <span style="font-size: 9pt; color: #64748b;">DATES</span>
  Company line: <div style="font-size: 9.5pt; color: #64748b; margin-bottom: 3px;">
  Bullets: <ul style="margin: 3px 0 10px 16px; padding: 0;"> <li style="margin-bottom: 2px; color: #374151;">
</div>

Close outer div.
""",

    "creative": """
Generate a creative resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 10.5pt; color: #374151; line-height: 1.5; max-width: 780px; margin: 0 auto; background: #ffffff;">

Header banner (full width, teal):
<div style="background: #0d9488; color: #ffffff; padding: 28px 36px 20px 36px;">
  - Name: <h1 style="font-size: 22pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0;">
  - Tagline: <p style="font-size: 10.5pt; color: #99f6e4; margin: 0 0 12px 0;">
  - Contact pills row: <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0;">
    Each pill: <span style="background: #0f766e; color: #ccfbf1; font-size: 9pt; padding: 3px 10px; border-radius: 20px;">
</div>

Body padding:
<div style="padding: 20px 36px 32px 36px;">

Skills as badges (immediately after header):
<div style="display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 20px;">
  Each badge: <span style="background: #ccfbf1; color: #0f766e; font-size: 9pt; padding: 4px 12px; border-radius: 20px; border: 1px solid #0d9488; font-weight: 500;">

Section headers (Experience, Education, etc.):
<h2 style="font-size: 11pt; font-weight: 700; color: #0d9488; margin: 20px 0 8px 0; padding-bottom: 4px; border-bottom: 2px solid #0d9488;">

Job entry:
<div style="margin-bottom: 14px; padding-left: 12px; border-left: 3px solid #0d9488;">
  Title line: flex row justify space-between.
  <strong style="font-size: 10.5pt; color: #1e293b;">TITLE</strong>  <span style="font-size: 9pt; color: #64748b; font-style: italic;">DATES</span>
  Company: <div style="font-size: 9.5pt; color: #64748b; margin-bottom: 4px;">
  Bullets: <ul style="margin: 3px 0 0 14px; padding: 0;"> <li style="margin-bottom: 2px;">
</div>

Education entries: same left-border style but without bullets if no notes.
Close body div, close outer div.
""",

    "minimal": """
Generate an ultra-minimal resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 10.5pt; color: #111827; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 40px 48px; background: #ffffff;">

Name:
<h1 style="font-size: 24pt; font-weight: 700; color: #111827; margin: 0 0 4px 0; letter-spacing: -0.5px;">

Tagline:
<p style="font-size: 11pt; color: #6b7280; margin: 0 0 6px 0; font-style: italic;">

Contact line (all on one line, separated by " · "):
<p style="font-size: 9pt; color: #9ca3af; margin: 0 0 10px 0;">

Top horizontal rule:
<hr style="border: none; border-top: 0.75px solid #d1d5db; margin: 10px 0 20px 0;">

Section headers (ALL CAPS, small, tracking):
<h2 style="font-size: 8pt; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.14em; margin: 22px 0 10px 0;">
Followed by a thin rule: <hr style="border: none; border-top: 0.75px solid #e5e7eb; margin: 0 0 10px 0;">

Job entry:
<div style="margin-bottom: 14px;">
  <div style="display: flex; justify-content: space-between; align-items: baseline;">
    <strong style="font-size: 10.5pt; color: #111827;">TITLE</strong>
    <span style="font-size: 9pt; color: #9ca3af;">DATES</span>
  </div>
  <div style="font-size: 9.5pt; color: #6b7280; margin-bottom: 4px;">Company · Location</div>
  Bullets: <ul style="margin: 3px 0 0 14px; padding: 0; list-style: disc;"> <li style="margin-bottom: 2px; color: #374151;">
</div>

Skills: plain <p> with comma-separated text, color #374151.
Close outer div.
""",

    "executive": """
Generate an executive-style resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #334155; line-height: 1.55; max-width: 780px; margin: 0 auto; padding: 0; background: #ffffff;">

Dark navy header:
<div style="background: #1e3a5f; padding: 28px 40px 0 40px;">
  - Name: <h1 style="font-size: 23pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.3px;">
  - Title: <p style="font-size: 11pt; color: #93c5fd; margin: 0 0 10px 0;">
  - Contact: <p style="font-size: 9.5pt; color: #94a3b8; margin: 0 0 0 0;">  (items separated by " · ")
  - Gold accent bar: <div style="background: #c9a84c; height: 4px; margin: 16px -40px 0 -40px;">
</div>

Body:
<div style="padding: 28px 40px 36px 40px;">

Executive Summary (first section, no top margin):
<h2 style="font-size: 10pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0; padding-bottom: 3px; border-bottom: 2px solid #1e3a5f;">
Summary paragraph: <p style="font-size: 10.5pt; color: #334155; margin: 0 0 18px 0; line-height: 1.6;">

Key Achievements section (metric-driven, before Work Experience):
<h2 style="...same header style... margin: 18px 0 10px 0;">
Achievement grid (3 columns):
<div style="display: flex; gap: 12px; margin-bottom: 18px;">
  Each card: <div style="flex: 1; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 14px; text-align: center;">
    Metric: <div style="font-size: 15pt; font-weight: 700; color: #2563eb; margin-bottom: 4px;">
    Label: <div style="font-size: 8.5pt; color: #64748b;">

Work Experience section: margin-top 18px.
All job entries:
<div style="margin-bottom: 14px;">
  Title+dates flex row.
  <strong style="font-size: 11pt; color: #1e293b;">TITLE</strong>  <span style="font-size: 9.5pt; color: #64748b;">DATES</span>
  Company: <div style="font-size: 10pt; color: #64748b; margin-bottom: 4px;">
  Bullets: <ul style="margin: 3px 0 0 16px; padding: 0;"> <li style="margin-bottom: 3px; color: #334155;">

Education: same section header, simpler entries without bullets.
Skills / Certifications: section header then <p>.

Close body div, close outer div.
""",
}


def build_prompt(form_data: dict, design: str) -> str:
    full_name = form_data.get("fullName", "")
    email = form_data.get("email", "")
    phone = form_data.get("phone", "")
    location = form_data.get("location", "")
    linkedin = form_data.get("linkedin", "")
    website = form_data.get("website", "")
    summary = form_data.get("summary", "")
    experience = form_data.get("experience", "")
    education = form_data.get("education", "")
    skills = form_data.get("skills", "")
    certifications = form_data.get("certifications", "")
    languages = form_data.get("languages", "")
    achievements = form_data.get("achievements", "")

    design_instruction = DESIGN_PROMPTS.get(design, DESIGN_PROMPTS["classic"])

    # Build contact string, omitting empty fields
    contact_parts = [p for p in [email, phone, location, linkedin, website] if p and p.strip()]
    contact_line = " · ".join(contact_parts)

    prompt = f"""You are an expert resume writer and HTML developer. Your task is to produce a complete, pixel-perfect resume in HTML using ONLY inline CSS styles.

DESIGN TEMPLATE TO FOLLOW EXACTLY:
{design_instruction}

CANDIDATE DATA (omit any section whose data is empty or "N/A"):
- Full Name: {full_name}
- Contact (pre-formatted, use as-is): {contact_line}
- Professional Summary: {summary if summary else "N/A"}
- Work Experience (each entry formatted as "Title | Company | Location | Dates\\nBullet points"):
{experience if experience else "N/A"}
- Education (each entry formatted as "Degree | Institution | Location | Dates\\nGPA / Notes"):
{education if education else "N/A"}
- Skills: {skills if skills else "N/A"}
- Certifications: {certifications if certifications else "N/A"}
- Languages: {languages if languages else "N/A"}
- Achievements/Awards: {achievements if achievements else "N/A"}

STRICT RULES — you MUST follow all of these:
1. Output ONLY raw HTML. No markdown. No code fences (``` or ```html). No explanation text before or after.
2. Use ONLY inline CSS (style="...") — absolutely NO <style> tags, NO <link> tags, NO class attributes.
3. Do NOT include <html>, <head>, <body>, or <!DOCTYPE> tags. Start with a <div> and end with </div>.
4. The HTML must render identically in both a browser div and Microsoft Word (when saved as .doc).
5. Avoid CSS features that Word does not support: no flexbox gap shorthand issues — use margin instead of gap where possible; use tables for multi-column layouts if needed for Word compatibility.
6. For the "modern" two-column layout, use an HTML <table> with two <td> cells instead of flexbox, so Word renders it correctly.
7. Use absolute font sizes (pt or px), not relative units (rem/em) for all text sizes.
8. Every bullet point that starts with "-" in the source data should become an HTML <li> element.
9. Omit entire sections if all their data fields are empty or "N/A".
10. Do not hallucinate or add content not in the candidate data.
"""
    return prompt


def lambda_handler(event, context):
    try:
        # Extract inputs
        form_data = {
            "fullName": event.get("fullName", ""),
            "email": event.get("email", ""),
            "phone": event.get("phone", ""),
            "location": event.get("location", ""),
            "linkedin": event.get("linkedin", ""),
            "website": event.get("website", ""),
            "summary": event.get("summary", ""),
            "experience": event.get("experience", ""),
            "education": event.get("education", ""),
            "skills": event.get("skills", ""),
            "certifications": event.get("certifications", ""),
            "languages": event.get("languages", ""),
            "achievements": event.get("achievements", ""),
        }
        design = event.get("design", "classic")
        user_email = event.get("userEmail", "anonymous")

        # Validate required fields
        if not form_data["fullName"] or not form_data["email"]:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Full name and email are required fields."})
            }

        prompt = build_prompt(form_data, design)

        message_list = [
            {"role": "user", "content": [{"text": prompt}]}
        ]

        system_list = [
            {"text": "You are an expert resume writer who generates polished, ATS-friendly HTML resumes. Always return clean HTML without markdown or code fences."}
        ]

        inf_params = {
            "max_new_tokens": 8000,
            "top_p": 0.85,
            "top_k": 20,
            "temperature": 0.3   # Lower = more deterministic layout
        }

        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }

        # Invoke Nova with streaming
        response = bedrock_client.invoke_model_with_response_stream(
            modelId=MODEL_ID,
            body=json.dumps(request_body)
        )

        stream = response.get("body")
        if not stream:
            return {
                "statusCode": 500,
                "body": json.dumps({"error": "No response received from AI model."})
            }

        # Collect streamed response
        resume_html = ""
        for chunk_event in stream:
            chunk = chunk_event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                delta_text = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                resume_html += delta_text

        # Strip any markdown artifacts the model may have added
        resume_html = resume_html.strip()
        if resume_html.startswith("```html"):
            resume_html = resume_html[7:]
        if resume_html.startswith("```"):
            resume_html = resume_html[3:]
        if resume_html.endswith("```"):
            resume_html = resume_html[:-3]
        resume_html = resume_html.strip()

        # Save to DynamoDB
        resume_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()

        try:
            resume_table.put_item(
                Item={
                    "resumeId": resume_id,
                    "userEmail": user_email,
                    "fullName": form_data["fullName"],
                    "design": design,
                    "formData": form_data,
                    "resumeHtml": resume_html,
                    "createdAt": created_at,
                }
            )
        except Exception as db_error:
            # Log DynamoDB error but still return the generated resume
            print(f"DynamoDB save error: {str(db_error)}")

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
            },
            "body": json.dumps({
                "resumeId": resume_id,
                "resumeHtml": resume_html,
                "design": design,
                "fullName": form_data["fullName"],
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"error": str(e)})
        }
