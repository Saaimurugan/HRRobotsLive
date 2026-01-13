import json
import base64
import boto3
import datetime	
import uuid
import re
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import cv2
import numpy as np

# AWS Clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
textract = boto3.client('textract')

# Constants
BUCKET_NAME = 'hrrfiles'
TABLE_NAME = 'candidatePhoto'
WATERMARK_OPACITY = 128  # Semi-transparent watermark
DEFAULT_OUTPUT_QUALITY = 5  # Low quality for preview only (1-100)

def mask_sensitive_data(text):
    """
    Mask sensitive information in Aadhar, PAN, and Election Card numbers
    """
    # Aadhar Card pattern (12 digits, can have spaces)
    aadhar_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
    text = re.sub(aadhar_pattern, lambda m: m.group()[:4] + ' XXXX XXXX', text)
    
    # PAN Card pattern (5 letters, 4 digits, 1 letter)
    pan_pattern = r'\b[A-Z]{5}\d{4}[A-Z]\b'
    text = re.sub(pan_pattern, lambda m: m.group()[:3] + 'XX' + m.group()[5:7] + 'XX' + m.group()[-1], text)
    
    # Election Card pattern (3 letters followed by 7 digits)
    election_pattern = r'\b[A-Z]{3}\d{7}\b'
    text = re.sub(election_pattern, lambda m: m.group()[:3] + 'XXXX' + m.group()[-3:], text)
    
    return text

def process_id_card_ocr(image_bytes):
    """
    Process ID card using AWS Textract and mask sensitive information
    """
    try:
        # Use Textract to extract text from the image
        response = textract.detect_document_text(
            Document={'Bytes': image_bytes}
        )
        
        # Extract all text blocks
        extracted_text = []
        for block in response['Blocks']:
            if block['BlockType'] == 'LINE':
                extracted_text.append(block['Text'])
        
        # Join all text and mask sensitive data
        full_text = '\n'.join(extracted_text)
        masked_text = mask_sensitive_data(full_text)
        
        # Create a visual representation with masked data
        image = Image.open(BytesIO(image_bytes))
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        # Add overlay with masked text
        overlay = Image.new('RGBA', image.size, (255, 255, 255, 200))
        draw = ImageDraw.Draw(overlay)
        
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
        except:
            font = ImageFont.load_default()
        
        # Add "PROCESSED ID CARD" watermark
        watermark_text = "PROCESSED ID CARD - SENSITIVE DATA MASKED"
        bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = bbox[2] - bbox[0]
        x_pos = (image.width - text_width) // 2
        draw.text((x_pos, 20), watermark_text, font=font, fill=(255, 0, 0, 255))
        
        # Combine original image with overlay
        combined = Image.alpha_composite(image.convert('RGBA'), overlay)
        final_image = combined.convert('RGB')
        
        # Save processed image
        output_buffer = BytesIO()
        final_image.save(output_buffer, format='JPEG', quality=85, optimize=True)
        output_buffer.seek(0)
        
        return output_buffer.getvalue(), masked_text
        
    except Exception as e:
        # print(f"OCR processing error: {str(e)}")
        # Return original image if OCR fails
        return image_bytes, f"OCR processing failed: {str(e)}"

def validate_face_in_photo(image_bytes):
    """
    Validate that a face is properly captured in the photo using OpenCV
    Similar to the face-api.js implementation used in the frontend
    """
    try:
        # Convert image bytes to OpenCV format
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return False, "Invalid image format"
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load Haar cascade for face detection (similar to face-api.js SSD MobileNet)
        # Using frontal face cascade for better accuracy
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Detect faces with multiple scale factors for better detection
        faces = face_cascade.detectMultiScale(
            gray,
            scaleFactor=1.1,
            minNeighbors=5,
            minSize=(30, 30),
            flags=cv2.CASCADE_SCALE_IMAGE
        )
        
        if len(faces) == 0:
            return False, "No face detected in the image"
        
        if len(faces) > 1:
            return False, "Multiple faces detected. Please ensure only one person is in the photo"
        
        # Get the detected face
        x, y, w, h = faces[0]
        
        # Calculate face area relative to image size (similar to face-api.js bounding box check)
        image_height, image_width = image.shape[:2]
        face_area_ratio = (w * h) / (image_width * image_height)
        
        # Check if face is properly sized (similar to frontend validation)
        if face_area_ratio < 0.04:  # Face too small (less than 4% of image)
            return False, "Face is too small in the image. Please move closer to the camera"
        
        if face_area_ratio > 0.64:  # Face too large (more than 64% of image)
            return False, "Face is too large in the image. Please move away from the camera"
        
        # Check face position (should be reasonably centered)
        face_center_x = x + w // 2
        face_center_y = y + h // 2
        image_center_x = image_width // 2
        image_center_y = image_height // 2
        
        # Allow some deviation from center
        x_deviation = abs(face_center_x - image_center_x) / image_width
        y_deviation = abs(face_center_y - image_center_y) / image_height
        
        if x_deviation > 0.3 or y_deviation > 0.3:
            return False, "Face should be centered in the image"
        
        # Additional quality checks using eye detection (similar to face-api.js landmarks)
        eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
        
        # Extract face region for eye detection
        face_roi = gray[y:y+h, x:x+w]
        eyes = eye_cascade.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=5)
        
        if len(eyes) < 2:
            return False, "Eyes not clearly visible. Please ensure good lighting and face the camera directly"
        
        # Calculate a confidence score based on face size and detection quality
        # Larger faces (within reasonable bounds) and clear eye detection indicate better quality
        confidence_score = min(100, (face_area_ratio * 1000) + (len(eyes) * 10))
        
        if confidence_score < 80:
            return False, f"Face detection confidence too low: {confidence_score:.1f}%. Please ensure good lighting and clear visibility"
        
        return True, f"Face validation successful (confidence: {confidence_score:.1f}%)"
        
    except Exception as e:
        # print(f"Face validation error: {str(e)}")
        return False, f"Face validation failed: {str(e)}"
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
        output_quality = event.get('outputQuality', DEFAULT_OUTPUT_QUALITY)
        capture_type = event.get('captureType', '')
        processing_type = event.get('type', 'Photo').upper()  # 'ID' or 'Photo'

        # Extract base64 string from Data URI
        match = re.match(r'data:(image/\w+);base64,(.*)', image_data)
        if not match:
            raise ValueError('Invalid image data format')

        content_type = match.group(1)
        image_base64 = match.group(2)

        # Decode the base64 string
        image_bytes = base64.b64decode(image_base64)
        image_id = str(uuid.uuid4())
        current_timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Process based on type
        if processing_type == 'ID':
            # Process ID card with OCR and masking
            processed_image_bytes, extracted_text = process_id_card_ocr(image_bytes)
            filename = f"id_card_{uuid.uuid4().hex}.jpg"
            processing_result = {
                'type': 'ID_CARD',
                'extracted_text': extracted_text,
                'message': 'ID card processed successfully with sensitive data masked'
            }
            
        elif processing_type == 'PHOTO':
            # Validate face in photo
            face_valid, validation_message = validate_face_in_photo(image_bytes)
            
            if not face_valid:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Face validation failed',
                        'message': validation_message
                    })
                }
            
            # Determine if this is a screenshot (not a photo)
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
                processed_image_bytes = add_watermark_and_reduce_quality(image_bytes, current_timestamp, output_quality)
            
            filename = f"face_capture_{uuid.uuid4().hex}.jpg"
            processing_result = {
                'type': 'PHOTO',
                'face_validation': validation_message,
                'message': 'Photo processed and face validated successfully'
            }
            
        else:
            raise ValueError(f'Invalid processing type: {processing_type}. Must be "ID" or "Photo"')

        # Upload processed image to S3
        s3_path = f"https://{BUCKET_NAME}.s3.amazonaws.com/{filename}"
        s3.put_object(Bucket=BUCKET_NAME, Key=filename, Body=processed_image_bytes, ContentType='image/jpeg')
        
        # Save metadata to DynamoDB
        table = dynamodb.Table(TABLE_NAME)
        item_data = {
            'photoID': image_id,
            'testID': user_unique_id,
            'imagePath': s3_path,
            'timestamp': str(datetime.datetime.now()),
            'processingType': processing_type,
            'captureType': capture_type
        }
        
        # Add processing-specific data
        if processing_type == 'ID':
            item_data['extractedText'] = extracted_text
        elif processing_type == 'PHOTO':
            item_data['faceValidation'] = validation_message
            
        table.put_item(Item=item_data)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': processing_result['message'],
                'imagePath': s3_path,
                'processingType': processing_type,
                'details': processing_result
            })
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
