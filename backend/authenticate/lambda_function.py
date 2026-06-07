import json

def lambda_handler(event, context):
    print(event)
    auth = 'Deny'
    
    if event.get('authorizationToken') == 'abc123':  # Using .get() to handle missing keys safely
        auth = 'Allow'
    
    authResponse = {
        'principalId': 'abc123',
        'policyDocument': {
            'Version': '2012-10-17',
            'Statement': [
                {
                    'Action': 'execute-api:Invoke',
                    'Resource': ["arn:aws:execute-api:us-east-1:850995535850:wssmlq04ef/*/*"],
                    'Effect': auth  # Ensure 'Effect' is inside the 'Statement'
                }
            ]
        }
    }
    
    return authResponse
