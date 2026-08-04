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

Name & Contact Header — use a TABLE to allow an optional photo on the right:
<table style="width: 100%; border-collapse: collapse; margin-bottom: 4px;"><tr>
<td style="padding: 0; vertical-align: middle;">
    <h1 style="font-size: 22pt; font-weight: 700; color: #1e293b; margin: 0 0 4px 0; letter-spacing: -0.3px;">NAME</h1>
    <p style="font-size: 11pt; color: #64748b; margin: 0 0 8px 0;">TITLE/TAGLINE</p>
    <p style="font-size: 9.5pt; color: #64748b; margin: 0;">CONTACT LINE (email · phone · location · linkedin · website)</p>
</td>
[IF CANDIDATE PHOTO IS PROVIDED, add a right cell:]
<td style="padding: 0; text-align: right; vertical-align: middle; width: 100px;">
    PHOTO_IMG_TAG_HERE
</td>
[END IF]
</tr></table>
- Full-width horizontal rule: <hr style="border: none; border-top: 1.5px solid #1e293b; margin: 12px 0 16px 0;">

Section headers:
<h2 style="font-size: 10.5pt; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em; margin: 18px 0 4px 0; padding-bottom: 3px; border-bottom: 1px solid #2563eb;">

Job entry title line — use a nested table for title + date on the same line:
<table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;"><tr>
<td style="padding: 0;"><strong style="font-size: 11pt; color: #1e293b;">JOB TITLE</strong></td>
<td style="padding: 0; text-align: right;"><span style="font-size: 9.5pt; color: #64748b;">START – END</span></td>
</tr></table>
<div style="font-size: 10pt; color: #64748b; margin-bottom: 4px;">Company · Location</div>

Bullet points: <ul style="margin: 4px 0 10px 18px; padding: 0;"> with <li style="margin-bottom: 3px; color: #374151;">

Education entry: same title-line pattern as job entries.

Skills: <p style="margin: 4px 0; color: #374151;"> (comma-separated)

Close outer div at the end.
""",

    "modern": """
Generate a modern two-column resume using ONLY inline CSS. Use an HTML TABLE for the two-column layout (required for correct rendering).

Use this EXACT outer structure — copy the style attributes verbatim:

<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 10.5pt; color: #374151; line-height: 1.5; max-width: 780px; margin: 0 auto; background: #ffffff;">
<table style="width: 100%; border-collapse: collapse; min-height: 900px;">
<tr style="vertical-align: top;">

LEFT COLUMN (td, 38% width, dark navy):
<td style="width: 38%; background: #1e3a5f; color: #e2e8f0; padding: 28px 20px; vertical-align: top;">
[IF CANDIDATE PHOTO IS PROVIDED, place it first, centered:]
<div style="text-align: center; margin-bottom: 16px;">
    PHOTO_IMG_TAG_HERE (override border-radius to 50%, width/height to 80px)
</div>
[END IF]
Name: <h1 style="font-size: 16pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; line-height: 1.2;">FULL NAME</h1>
Job title: <p style="font-size: 9.5pt; color: #93c5fd; margin: 0 0 16px 0;">CURRENT TITLE</p>
Divider: <hr style="border: none; border-top: 1px solid #3b82f6; margin: 0 0 16px 0;">
Sidebar section headers (Contact, Skills, Certifications, Languages):
    <h3 style="font-size: 8.5pt; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.1em; margin: 16px 0 8px 0;">SECTION</h3>
Contact items: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0;">VALUE</p>
Skill items: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0; padding-left: 8px; border-left: 2px solid #3b82f6;">SKILL</p>
Certifications / Languages: <p style="font-size: 9pt; color: #cbd5e1; margin: 3px 0;">VALUE</p>
</td>

RIGHT COLUMN (td, 62% width, white):
<td style="width: 62%; background: #ffffff; padding: 28px 28px 28px 24px; vertical-align: top;">
Section headers: <h2 style="font-size: 10pt; font-weight: 700; color: #2563eb; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 4px 0; padding-bottom: 3px; border-bottom: 1.5px solid #2563eb;">
First section margin-top: 0; subsequent sections margin-top: 18px.
Job entry uses a nested table for title + dates on same line:
<table style="width: 100%; border-collapse: collapse; margin-bottom: 2px;"><tr>
    <td style="padding: 0;"><strong style="font-size: 10.5pt; color: #1e293b;">TITLE</strong></td>
    <td style="padding: 0; text-align: right;"><span style="font-size: 9pt; color: #64748b;">DATES</span></td>
</tr></table>
Company line: <div style="font-size: 9.5pt; color: #64748b; margin-bottom: 3px;">Company · Location</div>
Bullets: <ul style="margin: 3px 0 10px 16px; padding: 0;"><li style="margin-bottom: 2px; color: #374151;">POINT</li></ul>
</td>

</tr>
</table>
</div>

Put Contact, Skills, Certifications, and Languages in the LEFT column.
Put Professional Summary, Work Experience, and Education in the RIGHT column.
""",

    "creative": """
Generate a creative resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 10.5pt; color: #374151; line-height: 1.5; max-width: 780px; margin: 0 auto; background: #ffffff;">

Header banner (full width, teal) — use a TABLE to allow optional photo on the right:
<div style="background: #0d9488; color: #ffffff; padding: 28px 36px 20px 36px;">
<table style="width: 100%; border-collapse: collapse;"><tr>
    <td style="padding: 0; vertical-align: middle;">
    <h1 style="font-size: 22pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0;">NAME</h1>
    <p style="font-size: 10.5pt; color: #99f6e4; margin: 0 0 12px 0;">TAGLINE</p>
    Contact pills: <span style="background: #0f766e; color: #ccfbf1; font-size: 9pt; padding: 3px 10px; border-radius: 20px; margin-right: 6px;">ITEM</span>
    </td>
    [IF CANDIDATE PHOTO IS PROVIDED:]
    <td style="padding: 0; text-align: right; vertical-align: middle; width: 100px;">
    PHOTO_IMG_TAG_HERE (override: border: 3px solid rgba(255,255,255,0.5))
    </td>
    [END IF]
</tr></table>
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
<table style="width: 100%; border-collapse: collapse;"><tr>
    <td style="padding: 0;"><strong style="font-size: 10.5pt; color: #1e293b;">TITLE</strong></td>
    <td style="padding: 0; text-align: right;"><span style="font-size: 9pt; color: #64748b; font-style: italic;">DATES</span></td>
</tr></table>
Company: <div style="font-size: 9.5pt; color: #64748b; margin-bottom: 4px;">
Bullets: <ul style="margin: 3px 0 0 14px; padding: 0;"><li style="margin-bottom: 2px;">
</div>

Education entries: same left-border style but without bullets if no notes.
Close body div, close outer div.
""",

    "minimal": """
Generate an ultra-minimal resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Georgia', 'Times New Roman', serif; font-size: 10.5pt; color: #111827; line-height: 1.6; max-width: 720px; margin: 0 auto; padding: 40px 48px; background: #ffffff;">

Name & contact header — use a TABLE so a photo can sit on the right if provided:
<table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;"><tr>
  <td style="padding: 0; vertical-align: bottom;">
    <h1 style="font-size: 24pt; font-weight: 700; color: #111827; margin: 0 0 4px 0; letter-spacing: -0.5px;">NAME</h1>
    <p style="font-size: 11pt; color: #6b7280; margin: 0 0 6px 0; font-style: italic;">TAGLINE</p>
    <p style="font-size: 9pt; color: #9ca3af; margin: 0;">CONTACT LINE (items separated by " · ")</p>
  </td>
  [IF CANDIDATE PHOTO IS PROVIDED, add right cell:]
  <td style="padding: 0; text-align: right; vertical-align: bottom; width: 90px;">
    PHOTO_IMG_TAG_HERE (override style: border-radius: 4px; width: 80px; height: 80px)
  </td>
  [END IF]
</tr></table>

Top horizontal rule:
<hr style="border: none; border-top: 0.75px solid #d1d5db; margin: 10px 0 20px 0;">

Section headers (ALL CAPS, small, tracking):
<h2 style="font-size: 8pt; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.14em; margin: 22px 0 10px 0;">
Followed by a thin rule: <hr style="border: none; border-top: 0.75px solid #e5e7eb; margin: 0 0 10px 0;">

Job entry:
<div style="margin-bottom: 14px;">
<table style="width: 100%; border-collapse: collapse;"><tr>
    <td style="padding: 0;"><strong style="font-size: 10.5pt; color: #111827;">TITLE</strong></td>
    <td style="padding: 0; text-align: right;"><span style="font-size: 9pt; color: #9ca3af;">DATES</span></td>
</tr></table>
<div style="font-size: 9.5pt; color: #6b7280; margin-bottom: 4px;">Company · Location</div>
Bullets: <ul style="margin: 3px 0 0 14px; padding: 0; list-style: disc;"><li style="margin-bottom: 2px; color: #374151;">
</div>

Skills: plain <p> with comma-separated text, color #374151.
Close outer div.
""",

    "executive": """
Generate an executive-style resume using ONLY inline CSS. Follow this exact structure:

Outer wrapper:
<div style="font-family: 'Calibri', Arial, sans-serif; font-size: 11pt; color: #334155; line-height: 1.55; max-width: 780px; margin: 0 auto; padding: 0; background: #ffffff;">

Dark navy header — use a TABLE to allow optional photo on the right:
<div style="background: #1e3a5f; padding: 28px 40px 0 40px;">
<table style="width: 100%; border-collapse: collapse;"><tr>
  <td style="padding: 0; vertical-align: middle;">
    <h1 style="font-size: 23pt; font-weight: 700; color: #ffffff; margin: 0 0 4px 0; letter-spacing: -0.3px;">NAME</h1>
    <p style="font-size: 11pt; color: #93c5fd; margin: 0 0 10px 0;">TITLE</p>
    <p style="font-size: 9.5pt; color: #94a3b8; margin: 0;">CONTACT (items separated by " · ")</p>
  </td>
  [IF CANDIDATE PHOTO IS PROVIDED, add right cell:]
  <td style="padding: 0; text-align: right; vertical-align: middle; width: 90px;">
    PHOTO_IMG_TAG_HERE (override style: border: 3px solid rgba(255,255,255,0.3); width: 80px; height: 80px)
  </td>
  [END IF]
</tr></table>
<div style="background: #c9a84c; height: 4px; margin: 16px -40px 0 -40px;"></div>
</div>

Body:
<div style="padding: 28px 40px 36px 40px;">

Executive Summary (first section, no top margin):
<h2 style="font-size: 10pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 6px 0; padding-bottom: 3px; border-bottom: 2px solid #1e3a5f;">
Summary paragraph: <p style="font-size: 10.5pt; color: #334155; margin: 0 0 18px 0; line-height: 1.6;">

Key Achievements section (metric-driven, before Work Experience):
<h2 style="font-size: 10pt; font-weight: 700; color: #1e3a5f; text-transform: uppercase; letter-spacing: 0.1em; margin: 18px 0 10px 0; padding-bottom: 3px; border-bottom: 2px solid #1e3a5f;">
Achievement grid (3 columns) using a TABLE:
<table style="width: 100%; border-collapse: separate; border-spacing: 10px 0; margin-bottom: 18px;">
<tr>
Each card as a <td style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 12px 14px; text-align: center; width: 33%;">
    Metric: <div style="font-size: 15pt; font-weight: 700; color: #2563eb; margin-bottom: 4px;">VALUE</div>
    Label: <div style="font-size: 8.5pt; color: #64748b;">LABEL</div>
</td>
</tr>
</table>

Work Experience section: margin-top 18px.
All job entries use a nested TABLE for title+dates:
<div style="margin-bottom: 14px;">
<table style="width: 100%; border-collapse: collapse;"><tr>
    <td style="padding: 0;"><strong style="font-size: 11pt; color: #1e293b;">TITLE</strong></td>
    <td style="padding: 0; text-align: right;"><span style="font-size: 9.5pt; color: #64748b;">DATES</span></td>
</tr></table>
Company: <div style="font-size: 10pt; color: #64748b; margin-bottom: 4px;">COMPANY · LOCATION</div>
Bullets: <ul style="margin: 3px 0 0 16px; padding: 0;"><li style="margin-bottom: 3px; color: #334155;">POINT</li></ul>
</div>

Education: same section header, simpler entries without bullets.
Skills / Certifications: section header then <p>.

Close body div, close outer div.
""",
}


def build_prompt(form_data: dict, design: str, photo_base64: str = "") -> str:
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

    # Build photo HTML snippet
    # The base64 photo is NOT sent to the AI — the model can't use it in a text prompt.
    # Instead we inject the <img> tag into the generated HTML after the fact.
    if photo_base64 and photo_base64.startswith('data:image'):
        photo_img_tag = (
            f'<img src="{photo_base64}" alt="" '
            f'style="width:80px; height:80px; border-radius:50%; '
            f'object-fit:cover; display:block;">'
        )
        photo_instruction = """CANDIDATE PHOTO: A profile photo has been provided and will be injected automatically into the header. Do NOT add any image tag, placeholder, or comment for a photo."""
    else:
        photo_img_tag = None
        photo_instruction = "CANDIDATE PHOTO: None provided — do NOT add any photo, placeholder, circle, or comment for a photo."

    prompt = f"""You are an expert resume writer and HTML developer. Your task is to produce a complete, pixel-perfect resume in HTML using ONLY inline CSS styles.

DESIGN TEMPLATE TO FOLLOW EXACTLY:
{design_instruction}

{photo_instruction}

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
    return prompt, photo_img_tag


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
        photo_base64 = event.get("photoBase64", "")

        # Validate required fields
        if not form_data["fullName"] or not form_data["email"]:
            return {
                "statusCode": 400,
                "body": json.dumps({"error": "Full name and email are required fields."})
            }

        prompt, photo_img_tag = build_prompt(form_data, design, photo_base64)

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

        # Inject photo into the generated HTML based on design
        if photo_img_tag:
            import re

            # Remove any <img> tags the AI may have hallucinated (broken placeholders)
            resume_html = re.sub(r'<img\b[^>]*>', '', resume_html)
            # Also remove any now-empty wrappers left behind (e.g. <p></p>, <div ...></div>)
            resume_html = re.sub(r'<(p|div|span)(\s[^>]*)?>(\s*)</\1>', '', resume_html)
            resume_html = re.sub(r'<(p|div|span)(\s[^>]*)?>\s*</\1>', '', resume_html)

            # Helper: add photo as a right-aligned <td> after the first name/contact <td>
            def inject_into_header_table(html, img):
                photo_td = (
                    f'<td style="padding:0; text-align:right; vertical-align:middle; width:96px;">'
                    f'<div style="display:inline-block;">{img}</div></td>'
                )
                first_td_close = re.search(r'</td>', html)
                if first_td_close:
                    pos = first_td_close.end()
                    return html[:pos] + photo_td + html[pos:]
                return html

            if design == 'modern':
                # Modern: photo at top of navy left sidebar, before the <h1>
                photo_sidebar = (
                    f'<div style="text-align:center; margin-bottom:16px;">'
                    f'<img src="{photo_base64}" alt="" '
                    f'style="width:80px; height:80px; border-radius:50%; object-fit:cover; '
                    f'display:inline-block; border:3px solid rgba(255,255,255,0.3);">'
                    f'</div>'
                )
                resume_html = re.sub(r'(<h1\b)', photo_sidebar + r'\1', resume_html, count=1)

            elif design in ('classic', 'executive', 'minimal', 'creative'):
                # These designs use a header table — add photo as a right-aligned second <td>
                resume_html = inject_into_header_table(resume_html, photo_img_tag)

            else:
                # Generic fallback: float right before first <h1>
                photo_wrapped = (
                    f'<div style="float:right; margin:0 0 8px 16px;">{photo_img_tag}</div>'
                )
                resume_html = re.sub(r'(<h1\b)', photo_wrapped + r'\1', resume_html, count=1)

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
                    "formData": form_data,  # does not include photo
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
