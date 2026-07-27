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
    "classic": "Use a clean, traditional resume layout with clear section headers (bold, underlined), bullet points for experience and skills, and a professional tone. Sections: Contact Info, Professional Summary, Work Experience, Education, Skills, Certifications.",
    "modern": "Use a modern two-column resume layout. Left column: contact info, skills, certifications, education. Right column: professional summary, work experience. Use colored section headers (use CSS inline styles with #2563eb for headings), horizontal rules, and clean spacing.",
    "creative": "Use a creative resume layout with a prominent header banner (dark background, white text), colored skill badges (rounded pill badges), timeline-style experience entries, and icons for contact info. Use CSS inline styles with a teal/green color palette (#0d9488).",
    "minimal": "Use an ultra-minimal resume layout. Maximum whitespace, simple typography, no colors except black and light grey. Use thin horizontal lines to separate sections. No icons, no decorations — just clean, readable text.",
    "executive": "Use an executive-style resume layout. Large name header, a strong executive summary at the top, then Key Achievements section before Work Experience. Use a dark navy color palette (#1e3a5f) for headings. Emphasize leadership, metrics, and impact in all descriptions.",
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

    prompt = f"""You are an expert resume writer and HTML/CSS developer. Generate a complete, professional resume in HTML format.

Design Instructions: {design_instruction}

Candidate Information:
- Full Name: {full_name}
- Email: {email}
- Phone: {phone}
- Location: {location}
- LinkedIn: {linkedin if linkedin else "N/A"}
- Website/Portfolio: {website if website else "N/A"}
- Professional Summary: {summary if summary else "N/A"}
- Work Experience: {experience if experience else "N/A"}
- Education: {education if education else "N/A"}
- Skills: {skills if skills else "N/A"}
- Certifications: {certifications if certifications else "N/A"}
- Languages: {languages if languages else "N/A"}
- Achievements/Awards: {achievements if achievements else "N/A"}

Requirements:
1. Return ONLY valid HTML (no markdown, no code fences, no explanation text).
2. Use inline CSS styles only — no <style> tags, no external stylesheets.
3. The HTML should be self-contained and ready to display in a browser div.
4. Do NOT include <html>, <head>, <body>, or <title> tags — start directly with a <div>.
5. Make it look polished, professional, and print-ready.
6. Use appropriate spacing, typography hierarchy, and visual balance.
7. If a field is "N/A", omit that section entirely from the resume.
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
