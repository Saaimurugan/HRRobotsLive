import boto3
import json
from boto3.dynamodb.conditions import Key, Attr
import logging

# Initialize AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Constants
BUCKET_NAME = 'hrrfiles'
TABLE_NAME = 'candidatePhoto'

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def check_s3_object_exists(s3_path):
    """
    Check if an S3 object exists given its path.
    Handles both full S3 URLs and S3 URIs.
    """
    try:
        # Extract key from various S3 path formats
        if s3_path.startswith(f"https://{BUCKET_NAME}.s3.amazonaws.com/"):
            key = s3_path.replace(f"https://{BUCKET_NAME}.s3.amazonaws.com/", "")
        elif s3_path.startswith(f"s3://{BUCKET_NAME}/"):
            key = s3_path.replace(f"s3://{BUCKET_NAME}/", "")
        else:
            key = s3_path
        
        # Try to get object metadata (head_object is faster than get_object)
        s3.head_object(Bucket=BUCKET_NAME, Key=key)
        return True
    except s3.exceptions.ClientError as e:
        if e.response['Error']['Code'] == '404':
            return False
        else:
            # Log other errors but don't fail
            logger.warning(f"Error checking S3 object {s3_path}: {str(e)}")
            return False
    except Exception as e:
        logger.warning(f"Unexpected error checking S3 object {s3_path}: {str(e)}")
        return False

def lambda_handler(event, context):
    """
    Scan candidatePhoto table and delete records where the S3 image no longer exists.
    """
    table = dynamodb.Table(TABLE_NAME)
    
    deleted_count = 0
    checked_count = 0
    errors = []
    
    try:
        logger.info(f"Starting orphaned photo cleanup for table: {TABLE_NAME}")
        
        # Scan the entire candidatePhoto table
        exclusive_start_key = None
        
        while True:
            # Scan with pagination
            if exclusive_start_key:
                response = table.scan(
                    ExclusiveStartKey=exclusive_start_key
                )
            else:
                response = table.scan()
            
            items = response.get('Items', [])
            logger.info(f"Processing batch of {len(items)} records")
            
            for item in items:
                checked_count += 1
                
                # Get the image path and primary key
                image_path = item.get('imagePath')
                photo_id = item.get('photoID')  # Assuming photoID is the primary key
                
                if not image_path:
                    logger.warning(f"Record with photoID {photo_id} has no imagePath")
                    continue
                
                if not photo_id:
                    logger.warning(f"Record has no photoID, skipping")
                    continue
                
                # Check if S3 object exists
                if not check_s3_object_exists(image_path):
                    logger.info(f"S3 object not found: {image_path}, deleting record with photoID: {photo_id}")
                    
                    try:
                        # Delete the DynamoDB record
                        # Adjust the Key parameter based on your table's primary key schema
                        table.delete_item(Key={'photoID': photo_id})
                        deleted_count += 1
                        logger.info(f"Deleted record: {photo_id}")
                    except Exception as delete_error:
                        error_msg = f"Failed to delete record {photo_id}: {str(delete_error)}"
                        logger.error(error_msg)
                        errors.append(error_msg)
            
            # Check if there are more records to scan
            exclusive_start_key = response.get('LastEvaluatedKey')
            if not exclusive_start_key:
                break
        
        result = {
            'status': 'success',
            'checked_records': checked_count,
            'deleted_records': deleted_count,
            'errors': errors if errors else None
        }
        
        logger.info(f"Cleanup completed: {result}")
        
        return {
            'statusCode': 200,
            'body': json.dumps(result)
        }
    
    except Exception as e:
        error_message = f"Cleanup failed: {str(e)}"
        logger.error(error_message)
        return {
            'statusCode': 500,
            'body': json.dumps({
                'status': 'error',
                'error': error_message,
                'checked_records': checked_count,
                'deleted_records': deleted_count
            })
        }
