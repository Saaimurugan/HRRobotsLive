# Token-based authorizer that validates tokens against DynamoDB
# DynamoDB Table: authTable
# Key: email (S) - the user's email
# authId: the token
# activeFor: 15 mins
# createdTime: timestamp when token was created

import json
import boto3
import base64
from datetime import datetime, timezone

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = 'authTable'


def decode_jwt_payload(token):
    """Decode JWT payload without verification (verification done by matching stored token)."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        # Add padding if needed
        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += '=' * padding
        payload_json = base64.urlsafe_b64decode(payload_b64)
        return json.loads(payload_json)
    except Exception:
        return None


def lambda_handler(event, context):

    print(event)

    token = event.get('authorizationToken', '')

    if not token:
        print('No token provided')
        raise Exception('Unauthorized')
    
    try:
        # Decode JWT to get email
        payload = decode_jwt_payload(token)
        if not payload or 'email' not in payload:
            print('Invalid token format or missing email')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        email = payload['email']
        
        # Check token in DynamoDB using email as primary key
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={'email': email})
        
        if 'Item' not in response:
            print(f'No auth record found for email')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        item = response['Item']
        
        # Verify the token matches the stored token
        stored_token = item.get('authId')
        if stored_token != token:
            print('Token does not match stored token')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        created_time_str = item.get('createdTime')
        refresh_time_str = item.get('refreshTime')
        active_for_minutes = item.get('activeFor')
        
        if not active_for_minutes:
            print('Token missing activeFor')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        if not created_time_str:
            print('Token missing createdTime')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        # Use refreshTime if available, otherwise use createdTime
        check_time_str = refresh_time_str if refresh_time_str else created_time_str
        check_time = datetime.fromisoformat(check_time_str.replace('Z', '+00:00'))
        # Ensure check_time is timezone-aware (handle naive datetimes from DB)
        if check_time.tzinfo is None:
            check_time = check_time.replace(tzinfo=timezone.utc)
        current_time = datetime.now(timezone.utc)
        elapsed_minutes = (current_time - check_time).total_seconds() / 60
        
        if elapsed_minutes > active_for_minutes:
            print(f'Token expired. Elapsed: {elapsed_minutes:.2f} mins, Active for: {active_for_minutes} mins')
            return generatePolicy('user', 'Deny', event.get('methodArn', '*'))
        
        # Token is valid - update refreshTime
        table.update_item(
            Key={'email': email},
            UpdateExpression='SET refreshTime = :rt',
            ExpressionAttributeValues={':rt': current_time.isoformat()}
        )
        
        print(f'Token valid. Elapsed: {elapsed_minutes:.2f} mins, Active for: {active_for_minutes} mins')
        return generatePolicy('user', 'Allow', event.get('methodArn', '*'))
        
    except Exception as e:
        print(f'Error validating token: {str(e)}')
        raise Exception('Unauthorized')

def generatePolicy(principalId, effect, resource):
    authResponse = {}
    authResponse['principalId'] = principalId
    if (effect and resource):
        policyDocument = {}
        policyDocument['Version'] = '2012-10-17'
        policyDocument['Statement'] = []
        statementOne = {}
        statementOne['Action'] = 'execute-api:Invoke'
        statementOne['Effect'] = effect
        statementOne['Resource'] = resource
        policyDocument['Statement'] = [statementOne]
        authResponse['policyDocument'] = policyDocument
    authResponse['context'] = {
        "stringKey": "stringval",
        "numberKey": 123,
        "booleanKey": True
    }
    authResponse_JSON = json.dumps(authResponse)
    return authResponse
