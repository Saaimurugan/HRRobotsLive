import boto3
import json
import uuid
import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Initialize DynamoDB and Lambda clients
dynamodb = boto3.resource('dynamodb')
lambda_client = boto3.client('lambda')

user_table_name = "userDetails"
userTable = dynamodb.Table(user_table_name)

table_name = "testTransactions"
table = dynamodb.Table(table_name)

def check_user_registered(email):
    """Check if the user is registered in the user table."""
    response = userTable.get_item(Key={"userId": email})
    return "Item" in response

def send_email(candidate_email, candidate_name, test_link, template_name, company_name):
    """Invoke the sendEmailSMTP Lambda function to send an email."""
    email_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://www.hrrobots.click/logo.png" alt="HR Robots Logo" style="max-width: 200px; height: auto;" />
          </div>
          <h2 style="color: #1cbbb4;">You're Invited to Take a Screening Test</h2>
          <p>Hello {candidate_name},</p>
          <p><strong>{company_name}</strong> has invited you to complete a screening test.</p>
          <p><strong>Test Name:</strong> {template_name or 'Screening Test'}</p>
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
    
    payload = {
        "recipient_email": candidate_email,
        "subject": f"{company_name} invited you to take a screening test",
        "body": email_body
    }
    
    try:
        response = lambda_client.invoke(
            FunctionName="sendEmailSMTP",
            InvocationType="RequestResponse",
            Payload=json.dumps(payload)
        )
        result = json.loads(response['Payload'].read())
        return result.get("statusCode") == 200
    except Exception as e:
        print(f"Error sending email to {candidate_email}: {str(e)}")
        return False

def create_single_test(candidate, email, template_id, template_name, company_name):
    """Create a single test and send email."""
    try:
        # Generate UUID for test
        uuidkey = str(uuid.uuid4())
        
        # Store in DynamoDB
        table.put_item(
            Item={
                "testID": uuidkey,
                "candidateName": candidate['name'],
                "templateID": template_id,
                "email": email,
                "status": "Not Started",
                "datetime": str(datetime.datetime.now())
            }
        )
        
        # Send email
        test_link = f"https://www.hrrobots.click/test/{uuidkey}"
        email_sent = send_email(
            candidate['email'], 
            candidate['name'], 
            test_link, 
            template_name, 
            company_name
        )
        
        return {
            "success": True,
            "candidate": candidate['name'],
            "email": candidate['email'],
            "testID": uuidkey,
            "email_sent": email_sent
        }
    except Exception as e:
        print(f"Error creating test for {candidate['name']}: {str(e)}")
        return {
            "success": False,
            "candidate": candidate['name'],
            "email": candidate['email'],
            "error": str(e)
        }

def lambda_handler(event, context):
    try:
        # Parse the event body
        JSONData = str(event)
        body = json.loads(JSONData.replace("'", '"'))
        
        email = body.get("globalValue")
        template_id = body.get("templateID")
        template_name = body.get("templateName", "Screening Test")
        candidates = body.get("candidates", [])
        
        if not email or not template_id:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Missing required parameters"})
            }
        
        # Check if user is registered
        if not check_user_registered(email):
            return {
                "statusCode": 500,
                "body": json.dumps({"message": "User not registered"})
            }
        
        if not candidates or len(candidates) == 0:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "No candidates provided"})
            }
        
        # Check if total tests would exceed limit
        # Query existing tests for this user
        from boto3.dynamodb.conditions import Key
        response = table.query(
            IndexName="email-index",
            KeyConditionExpression=Key("email").eq(email),
            ProjectionExpression="testID"
        )
        
        existing_count = len(response.get("Items", []))
        
        # Continue pagination if needed
        while "LastEvaluatedKey" in response and existing_count < 10000:
            response = table.query(
                IndexName="email-index",
                KeyConditionExpression=Key("email").eq(email),
                ProjectionExpression="testID",
                ExclusiveStartKey=response["LastEvaluatedKey"]
            )
            existing_count += len(response.get("Items", []))
        
        if existing_count + len(candidates) > 25:
            return {
                "statusCode": 400,
                "body": json.dumps({
                    "message": f"Cannot create tests. You have {existing_count} existing tests. Adding {len(candidates)} would exceed the limit of 25."
                })
            }
        
        # Process candidates in parallel
        results = []
        successful = 0
        failed = 0
        
        with ThreadPoolExecutor(max_workers=10) as executor:
            future_to_candidate = {
                executor.submit(
                    create_single_test, 
                    candidate, 
                    email, 
                    template_id, 
                    template_name,
                    email
                ): candidate for candidate in candidates
            }
            
            for future in as_completed(future_to_candidate):
                result = future.result()
                results.append(result)
                if result['success']:
                    successful += 1
                else:
                    failed += 1
        
        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": "Bulk test creation completed",
                "successful": successful,
                "failed": failed,
                "details": results
            })
        }
        
    except Exception as e:
        print(f"Error in bulk test creation: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({"message": f"Error: {str(e)}"})
        }
