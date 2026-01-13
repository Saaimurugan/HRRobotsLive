import json
import base64
import boto3
import datetime	
import uuid
import re
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

# AWS Clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

# Constants
BUCKET_NAME = 'hrrfiles'
TABLE_NAME = 'candidatePhoto'
WATERMARK_OPACITY = 128  # Semi-transparent watermark
DEFAULT_OUTPUT_QUALITY = 5  # Low quality for preview only (1-100)

def add_watermark_and_reduce_quality(image_bytes, timestamp_text, output_quality=DEFAULT_OUTPUT_QUALITY):
    """
    Reduce image quality first, then add timestamp watermark to make it preview-only.
    """
    # Open the image
    image = Image.open(BytesIO(image_bytes))
    
    # Convert to RGB if necessary (for JPEG output)
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # STEP 1: Reduce quality first by saving and reloading
    quality_buffer = BytesIO()
    image.save(quality_buffer, format='JPEG', quality=output_quality, optimize=True)
    quality_buffer.seek(0)
    image = Image.open(quality_buffer)
    
    # STEP 2: Now apply watermark on the reduced quality image
    # Create a drawing context
    draw = ImageDraw.Draw(image)
    
    # Get image dimensions
    img_width, img_height = image.size
    
    # Try to use a font, fall back to default if not available
    try:
        font_size = max(20, img_width // 25)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Watermark text with timestamp
    watermark_text = f"PREVIEW ONLY - {timestamp_text}"
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Add diagonal watermarks across the image
    for y_offset in range(0, img_height, int(img_height / 3)):
        for x_offset in range(0, img_width, int(img_width / 2)):
            # Draw shadow for better visibility
            draw.text((x_offset + 2, y_offset + 2), watermark_text, font=font, fill=(0, 0, 0, WATERMARK_OPACITY))
            # Draw main watermark text
            draw.text((x_offset, y_offset), watermark_text, font=font, fill=(255, 0, 0, WATERMARK_OPACITY))
    
    # Add timestamp at the bottom
    bottom_text = f"Captured: {timestamp_text}"
    bbox = draw.textbbox((0, 0), bottom_text, font=font)
    text_width = bbox[2] - bbox[0]
    x_pos = (img_width - text_width) // 2
    y_pos = img_height - text_height - 10
    
    # Draw bottom timestamp with background
    draw.rectangle([x_pos - 5, y_pos - 5, x_pos + text_width + 5, y_pos + text_height + 5], fill=(0, 0, 0))
    draw.text((x_pos, y_pos), bottom_text, font=font, fill=(255, 255, 255))
    
    # Save with reduced quality
    output_buffer = BytesIO()
    image.save(output_buffer, format='JPEG', quality=output_quality, optimize=True)
    output_buffer.seek(0)
    
    return output_buffer.getvalue()

def lambda_handler(event, context):
    try:
        image_data = event.get('image')
        user_unique_id = event.get('userUniqueID')
        output_quality = event.get('outputQuality', DEFAULT_OUTPUT_QUALITY)  # Get quality from FE, default to 5
        capture_type = event.get('captureType', '')  # Get capture type to distinguish photos from screenshots

        # Extract base64 string from Data URI
        match = re.match(r'data:(image/\w+);base64,(.*)', image_data)
        if not match:
            raise ValueError('Invalid image data format')

        content_type = match.group(1)  # e.g., image/jpeg
        image_base64 = match.group(2)

        # Decode the base64 string
        image_bytes = base64.b64decode(image_base64)
        image_id = str(uuid.uuid4())

        # Determine if this is a screenshot (not a photo)
        # Screenshots have captureType like 'consent_screenshot', 'final_submission_screenshot', 'fullscreen', 'focus', etc.
        is_screenshot = capture_type and capture_type != ''
        
        if is_screenshot:
            # For screenshots: save without watermark, just adjust quality if needed
            image = Image.open(BytesIO(image_bytes))
            if image.mode in ('RGBA', 'P'):
                image = image.convert('RGB')
            output_buffer = BytesIO()
            image.save(output_buffer, format='JPEG', quality=output_quality, optimize=True)
            output_buffer.seek(0)
            processed_image_bytes = output_buffer.getvalue()
        else:
            # For photos: add watermark and reduce quality
            current_timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            processed_image_bytes = add_watermark_and_reduce_quality(image_bytes, current_timestamp, output_quality)

        # Always save as JPEG (reduced quality)
        filename = f"face_capture_{uuid.uuid4().hex}.jpg"
        s3_path = f"https://{BUCKET_NAME}.s3.amazonaws.com/{filename}"
        
        # Upload processed image to S3
        s3.put_object(Bucket=BUCKET_NAME, Key=filename, Body=processed_image_bytes, ContentType='image/jpeg')
        
        # Save metadata to DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        table.put_item(
            Item={
                'photoID': image_id,
                'testID': user_unique_id,
                'imagePath': s3_path,
                'timestamp': str(datetime.datetime.now())
            }
        )
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Image uploaded and saved successfully', 'imagePath': s3_path})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
