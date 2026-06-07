import boto3
import json

# Initialize DynamoDB resource
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table("testTransactions")

def lambda_handler(event, context):
    try:
        # Parse the event body (handle both API Gateway and direct invoke formats)
        if 'body' in event:
            body = json.loads(event['body'])
        else:
            body = event

        # Extract testID from the request body
        testID = body.get("testID")

        if not testID:
            return {
                "statusCode": 400,
                "body": json.dumps({"message": "Missing 'testID' in the request"})
            }

        # Delete the item from DynamoDB
        response = table.delete_item(
            Key={
                "testID": testID
            }
        )

        return {
            "statusCode": 200,
            "body": json.dumps({
                "message": f"Successfully deleted testID: {testID}"
            })
        }

    except Exception as e:
        return {
            "statusCode": 500,
            "body": json.dumps({"message": str(e)})
        }
