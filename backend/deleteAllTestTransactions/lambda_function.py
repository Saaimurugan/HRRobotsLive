import boto3
import json
import logging

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
s3 = boto3.client('s3')

# Table and bucket names
TEST_TRANSACTIONS_TABLE = 'testTransactions'
CANDIDATE_PHOTO_TABLE = 'candidatePhoto'
S3_BUCKET = 'hrrfiles'

# Configure logging
logger = logging.getLogger()
logger.setLevel(logging.INFO)

def delete_s3_photos_for_test(test_id):
    """
    Delete S3 photos associated with a test transaction.
    """
    deleted_photos = 0
    try:
        # Query candidatePhoto table for this testID
        photo_table = dynamodb.Table(CANDIDATE_PHOTO_TABLE)
        response = photo_table.scan(
            FilterExpression=boto3.dynamodb.conditions.Attr('testID').eq(test_id)
        )
        
        photo_items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = photo_table.scan(
                FilterExpression=boto3.dynamodb.conditions.Attr('testID').eq(test_id),
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            photo_items.extend(response.get('Items', []))
        
        # Delete S3 objects and DynamoDB records
        for photo_item in photo_items:
            # Delete from S3
            image_path = photo_item.get('imagePath', '')
            if image_path:
                try:
                    # Extract key from S3 path
                    if image_path.startswith(f"https://{S3_BUCKET}.s3.amazonaws.com/"):
                        key = image_path.replace(f"https://{S3_BUCKET}.s3.amazonaws.com/", "")
                    elif image_path.startswith(f"s3://{S3_BUCKET}/"):
                        key = image_path.replace(f"s3://{S3_BUCKET}/", "")
                    else:
                        key = image_path
                    
                    s3.delete_object(Bucket=S3_BUCKET, Key=key)
                    logger.info(f"Deleted S3 object: {key}")
                except Exception as s3_error:
                    logger.warning(f"Failed to delete S3 object {image_path}: {str(s3_error)}")
            
            # Delete from DynamoDB
            photo_id = photo_item.get('photoID')
            if photo_id:
                try:
                    photo_table.delete_item(Key={'photoID': photo_id})
                    deleted_photos += 1
                except Exception as db_error:
                    logger.warning(f"Failed to delete photo record {photo_id}: {str(db_error)}")
        
        return deleted_photos
    except Exception as e:
        logger.error(f"Error deleting photos for test {test_id}: {str(e)}")
        return deleted_photos

def lambda_handler(event, context):
    """
    Delete all records from the testTransactions table and associated photos.
    This is a highly destructive operation.
    """
    test_table = dynamodb.Table(TEST_TRANSACTIONS_TABLE)
    
    deleted_test_count = 0
    deleted_photo_count = 0
    checked_count = 0
    errors = []
    
    try:
        logger.info(f"Starting deletion of all test transactions from table: {TEST_TRANSACTIONS_TABLE}")
        
        # Scan the table to get all items (use pagination)
        response = test_table.scan()
        items = response.get('Items', [])
        
        # Handle pagination
        while 'LastEvaluatedKey' in response:
            response = test_table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        logger.info(f"Found {len(items)} test transactions to delete")
        
        # Retrieve primary key schema
        key_schema = test_table.key_schema
        primary_keys = [k['AttributeName'] for k in key_schema]
        
        # Delete each item using only primary key attributes
        for item in items:
            checked_count += 1
            test_id = item.get('testID')
            
            try:
                # Delete associated photos first
                if test_id:
                    photos_deleted = delete_s3_photos_for_test(test_id)
                    deleted_photo_count += photos_deleted
                    logger.info(f"Deleted {photos_deleted} photos for test {test_id}")
                
                # Delete the test transaction record
                key = {k: item[k] for k in primary_keys if k in item}
                test_table.delete_item(Key=key)
                deleted_test_count += 1
                
                if deleted_test_count % 10 == 0:
                    logger.info(f"Progress: Deleted {deleted_test_count} test transactions")
                
            except Exception as delete_error:
                error_msg = f"Failed to delete test transaction {test_id}: {str(delete_error)}"
                logger.error(error_msg)
                errors.append(error_msg)
        
        result = {
            "status": "success",
            "deleted_test_transactions": deleted_test_count,
            "deleted_photos": deleted_photo_count,
            "checked_records": checked_count,
            "errors": errors if errors else None
        }
        
        logger.info(f"Deletion completed: {result}")
        
        return {
            "statusCode": 200,
            "body": json.dumps(result)
        }
    
    except Exception as e:
        error_message = f"Deletion failed: {str(e)}"
        logger.error(error_message)
        return {
            "statusCode": 500,
            "body": json.dumps({
                "status": "error",
                "message": error_message,
                "deleted_test_transactions": deleted_test_count,
                "deleted_photos": deleted_photo_count,
                "checked_records": checked_count
            })
        }
