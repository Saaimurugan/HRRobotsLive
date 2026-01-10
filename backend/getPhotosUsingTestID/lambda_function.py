import boto3
import json
from boto3.dynamodb.conditions import Key, Attr
from botocore.config import Config

# S3 client with signature v4 for pre-signed URLs
s3 = boto3.client('s3', config=Config(signature_version='s3v4'))
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('candidatePhoto')

BUCKET_NAME = 'hrrfiles'
PRESIGNED_URL_EXPIRY = 300  # 5 minutes

def generate_presigned_url(s3_path):
    """
    Generate a pre-signed URL from an S3 path.
    """
    try:
        # Extract key from full S3 URL: https://hrrfiles.s3.amazonaws.com/filename.jpg
        if s3_path.startswith(f"https://{BUCKET_NAME}.s3.amazonaws.com/"):
            key = s3_path.replace(f"https://{BUCKET_NAME}.s3.amazonaws.com/", "")
        elif s3_path.startswith(f"s3://{BUCKET_NAME}/"):
            key = s3_path.replace(f"s3://{BUCKET_NAME}/", "")
        else:
            key = s3_path
        
        return s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': key},
            ExpiresIn=PRESIGNED_URL_EXPIRY
        )
    except Exception as e:
        print(f"Error generating presigned URL: {str(e)}")
        return None

def lambda_handler(event, context):
    test_id = event.get('searchTerm')
    
    if not test_id:
        return {
            'statusCode': 400,
            'body': json.dumps({'error': 'Missing searchTerm in payload'})
        }

    image_urls = []
    exclusive_start_key = None

    try:
        while True:
            if exclusive_start_key:
                response = table.scan(
                    FilterExpression=Attr('testID').eq(test_id),
                    ExclusiveStartKey=exclusive_start_key
                )
            else:
                response = table.scan(
                    FilterExpression=Attr('testID').eq(test_id)
                )

            items = response.get('Items', [])
            for item in items:
                if 'imagePath' in item:
                    presigned_url = generate_presigned_url(item['imagePath'])
                    if presigned_url:
                        image_urls.append({'url': presigned_url})

            exclusive_start_key = response.get('LastEvaluatedKey')
            if not exclusive_start_key:
                break

        return {
            'statusCode': 200,
            'body': json.dumps(image_urls)
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
