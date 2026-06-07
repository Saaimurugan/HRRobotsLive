import boto3
import json
import uuid   

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')

user_table_name = "userDetails"
userTable = dynamodb.Table(user_table_name)

table_name = "ForgotPassword"
table = dynamodb.Table(table_name)

# Initialize Lambda client
lambda_client = boto3.client('lambda')

def send_email(email, uuidkey):
    """Invoke the sendEmailSMTP Lambda function to send an email."""
    payload = {
        "recipient_email": email,
        "subject": "HR Robots - Password Reset",
        "body": f"""<html><head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'><style>body {{font-family: Arial, sans-serif;margin: 0;padding: 0;background-color: #f4f4f9;}}.email-container {{max-width: 600px;margin: 50px auto;background-color: #ffffff;border-radius: 8px;overflow: hidden;box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);}}.header {{background-color: #1CBBB4;color: #ffffff;text-align: center;padding: 20px;}}.header h1 {{margin: 0;font-size: 24px;}}.content {{padding: 30px;color: #333333;text-align: left;}}.content p {{margin-bottom: 20px;line-height: 1.6;}}.button-container {{text-align: center;margin: 20px 0;}}.button {{display: inline-block;padding: 15px 25px;font-size: 16px;color: #ffffff;background-color: #007bff;border: none;border-radius: 4px;text-decoration: none;}}.button:hover {{background-color: #0056b3;}}.footer {{text-align: center;font-size: 12px;color: #aaaaaa;padding: 15px;background-color: #f4f4f9;}}.footer a {{color: #007bff;text-decoration: none;}}</style></head><body><div class='email-container'><div class='header'><h1>Reset Your Password</h1></div><div class='content'><p>Hello,</p><p>You recently requested to reset your password for your HRRobots.com account. Click the button below to reset it:</p><div class='button-container'><a href='https://www.hrrobots.click/reset/{uuidkey}' class='button'>Reset Password</a></div><p>If you did not request a password reset, please ignore this email or contact support if you have any questions.</p><p>Thanks,<br>The HRRobots.com Team</p></div><div class='footer'><p>If you're having trouble clicking the 'Reset Password' button, copy and paste the following URL into your web browser:</p><p><a href=https://www.hrrobots.click/reset/{uuidkey}'>https://www.hrrobots.click/reset/{uuidkey}</a></p></div></div></body></html>"""
    }
    response = lambda_client.invoke(
        FunctionName="sendEmailSMTP",  # Replace with the name of your sendEmailSMTP Lambda function
        InvocationType="RequestResponse",  # Use "Event" for async invocation
        Payload=json.dumps(payload)
    )
    return json.loads(response['Payload'].read())

def checkUserRegistered(email):
    """Check if the user is registered in the user table."""
    response = userTable.get_item(Key={"userId": email})

    if "Item" in response:
        return "false"
    else:
        return "true"

def lambda_handler(event, context):
    try:
        # Parse the event body to extract the email
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))
        email = body["recipient_email"].lower().strip()

        checkUser = checkUserRegistered(email)
        print(checkUser)
        if (checkUser=="true"):
            return {
                "statusCode": 500,
                "body": json.dumps({"message": "User not registered"})
            }

        # Generate a new id using UUID
        uuidkey = str(uuid.uuid4())

        # Store the email and the generated id in DynamoDB
        table.put_item(
            Item={
                "ForgotPasswordID": uuidkey,
                "email": email,
            }
        )

        # Send email to the user with the generated id
        email_response = send_email(email, uuidkey)

        # Check if email was sent successfully
        if email_response.get("statusCode") == 200:
            return {
                "statusCode": 200,
                "body": json.dumps({
                    "message": "email sent successfully."
                })
            }
        else:
            return {
                "statusCode": 500,
                "body": json.dumps({
                    "message": f"email not sent, please contact bot@hrrobots.com."
                })
            }
    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
