# Token-based authorizer that validates tokens against DynamoDB
# DynamoDB Table: authTable
# Key: authId (S) - the token
# activeFor: 15 mins
# createdTime: timestamp when token was created

import json
import boto3
import os
from datetime import datetime, timezone

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
TABLE_NAME = 'authTable'

def lambda_handler(event, context):
    token = event.get('authorizationToken', '')
    
    if not token:
        print('No token provided')
        raise Exception('Unauthorized')
    
    try:
        # Check token in DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        response = table.get_item(Key={'authId': token})
        
        if 'Item' not in response:
            print(f'Token not found in database')
            return generatePolicy('user', 'Deny', event['methodArn'])
        
        item = response['Item']
        created_time_str = item.get('createdTime')
        refresh_time_str = item.get('refreshTime')
        active_for_minutes = item.get('activeFor')
        
        if not active_for_minutes:
            print('Token missing activeFor')
            return generatePolicy('user', 'Deny', event['methodArn'])
        
        if not created_time_str:
            print('Token missing createdTime')
            return generatePolicy('user', 'Deny', event['methodArn'])
        
        # Use refreshTime if available, otherwise use createdTime
        check_time_str = refresh_time_str if refresh_time_str else created_time_str
        check_time = datetime.fromisoformat(check_time_str.replace('Z', '+00:00'))
        current_time = datetime.now(timezone.utc)
        elapsed_minutes = (current_time - check_time).total_seconds() / 60
        
        if elapsed_minutes > active_for_minutes:
            print(f'Token expired. Elapsed: {elapsed_minutes:.2f} mins, Active for: {active_for_minutes} mins')
            return generatePolicy('user', 'Deny', event['methodArn'])
        
        # Token is valid - update refreshTime
        table.update_item(
            Key={'authId': token},
            UpdateExpression='SET refreshTime = :rt',
            ExpressionAttributeValues={':rt': current_time.isoformat()}
        )
        
        print(f'Token valid. Elapsed: {elapsed_minutes:.2f} mins, Active for: {active_for_minutes} mins')
        return generatePolicy('user', 'Allow', event['methodArn'])
        
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
    return authResponse_JSON
