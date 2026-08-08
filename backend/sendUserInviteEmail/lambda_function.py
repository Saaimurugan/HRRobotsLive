import json
import boto3

SEND_EMAIL_FUNCTION = "sendEmailSMTP"
lambda_client = boto3.client("lambda", region_name="us-east-1")


def build_html(inviter_email, signup_url):
    return f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.hrrobots.click/logo.png" alt="HR Robots Logo" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #1cbbb4;">You're Invited to HR Robots!</h2>
          <p>Hello,</p>
          <p><strong>{inviter_email}</strong> has invited you to join HR Robots platform.</p>
          <p>HR Robots helps streamline your hiring process with AI-powered tools for candidate
             profiling, interviews, and more.</p>
          <p style="margin-top: 20px;">
            <a href="{signup_url}"
               style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
                      color: white;
                      padding: 12px 24px;
                      text-decoration: none;
                      border-radius: 6px;
                      display: inline-block;">
              Get Started
            </a>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 14px;">
            If you have any questions, please contact the person who invited you.
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

    recipient_email = event.get("recipient_email", "").strip()
    inviter_email = event.get("inviter_email", "").strip()
    # Allow frontend to pass its own origin so local dev also works
    signup_url = event.get("signup_url", "https://www.hrrobots.click/signup").strip()

    if not recipient_email:
        return {"statusCode": 400, "body": json.dumps({"error": "recipient_email is required"})}
    if not inviter_email:
        return {"statusCode": 400, "body": json.dumps({"error": "inviter_email is required"})}

    subject = f"{inviter_email} invited you to join HR Robots"
    body_html = build_html(inviter_email, signup_url)

    payload = {
        "recipient_email": recipient_email,
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
