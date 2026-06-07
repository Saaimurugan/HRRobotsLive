import boto3
import json
import logging

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Create an SES client
ses_client = boto3.client('ses')

# Replace with your verified email in SES
SENDER_EMAIL = "bot@hrrobots.com"

def lambda_handler(event, context):
    try:
        # Extract data from the event
        recipient_email = event.get("recipient_email")
        subject = event.get("subject", "Default Subject")
        body = event.get("body", "This is the default email body.")
        
        if not recipient_email:
            raise ValueError("Recipient email is required.")
        
        # Send the email
        response = ses_client.send_email(
            Source=SENDER_EMAIL,
            Destination={
                'ToAddresses': [recipient_email],
            },
            Message={
                'Subject': {
                    'Data': subject,
                },
                'Body': {
                    'Html': {
                        'Data': body,
                    }
                }
            }
        )
        
        logger.info("Email sent successfully.")
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Email sent successfully.",
                "response": response
            })
        }
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "message": "Failed to send email.",
                "error": str(e)
            })
        }
