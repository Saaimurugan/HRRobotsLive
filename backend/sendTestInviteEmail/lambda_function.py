import json
import boto3

SEND_EMAIL_FUNCTION = "sendEmailSMTP"
lambda_client = boto3.client("lambda", region_name="us-east-1")


def build_html(candidate_name, company_name, template_name, test_link):
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.hrrobots.click/logo.png" alt="HR Robots Logo" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #1cbbb4;">You're Invited to Take a Screening Test</h2>
          <p>Hello {candidate_name},</p>
          <p><strong>{company_name}</strong> has invited you to complete a screening test.</p>
          <p><strong>Test Name:</strong> {template_name}</p>
          <p style="margin-top: 20px;">
            <a href="{test_link}"
               style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                      color: white;
                      padding: 12px 24px;
                      text-decoration: none;
                      border-radius: 6px;
                      display: inline-block;">
              Start Test
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            Good luck!
          </p>
        </div>
    """


def lambda_handler(event, context):
    # Support API Gateway proxy integration
    if "body" in event and isinstance(event["body"], str):
        try:
            event = json.loads(event["body"])
        except (json.JSONDecodeError, TypeError):
            pass

    candidate_name = event.get("candidate_name", "").strip()
    candidate_email = event.get("candidate_email", "").strip()
    company_name = event.get("company_name", "").strip()
    template_name = event.get("template_name", "Screening Test").strip()
    test_link = event.get("test_link", "").strip()

    if not candidate_name:
        return {"statusCode": 400, "body": json.dumps({"error": "candidate_name is required"})}
    if not candidate_email:
        return {"statusCode": 400, "body": json.dumps({"error": "candidate_email is required"})}
    if not company_name:
        return {"statusCode": 400, "body": json.dumps({"error": "company_name is required"})}
    if not test_link:
        return {"statusCode": 400, "body": json.dumps({"error": "test_link is required"})}

    subject = f"{company_name} invited you to take a screening test"
    body_html = build_html(candidate_name, company_name, template_name, test_link)

    payload = {
        "recipient_email": candidate_email,
        "subject": subject,
        "body": body_html,
    }

    try:
        response = lambda_client.invoke(
            FunctionName=SEND_EMAIL_FUNCTION,
            InvocationType="RequestResponse",
            Payload=json.dumps(payload),
        )
        result = json.loads(response["Payload"].read())
        return result
    except Exception as e:
        return {"statusCode": 500, "body": json.dumps({"error": str(e)})}
