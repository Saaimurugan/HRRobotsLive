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
DEFAULT_OUTPUT_QUALITY = 5  # Low quality for proctor captures (1-100)
HIGH_QUALITY_OUTPUT = 85  # High quality for pre-test identity verification photos

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

def is_sensitive_text(text):
    """
    Check if text matches sensitive ID patterns or contains numbers that should be masked
    """
    text_clean = text.replace(' ', '').replace('-', '')
    
    # Aadhar Card pattern (12 digits)
    if re.search(r'\d{4}\s?\d{4}\s?\d{4}', text):
        return True
    # PAN Card pattern
    if re.search(r'[A-Z]{5}\d{4}[A-Z]', text):
        return True
    # Election Card pattern
    if re.search(r'[A-Z]{3}\d{7}', text):
        return True
    # Any sequence of 4+ consecutive digits (covers most ID numbers)
    if re.search(r'\d{4,}', text_clean):
        return True
    # Mixed alphanumeric that looks like ID (letters and numbers mixed)
    if re.search(r'[A-Z]+\d+[A-Z]*\d*', text) and len(text_clean) >= 6:
        return True
    return False

def process_id_card_ocr(image_bytes):
    """
    Process ID card using AWS Textract, visually mask sensitive regions on image
    """
    extracted_text = []
    masked_text = ""
    
    try:
        # Open image for processing
        image = Image.open(BytesIO(image_bytes))
        if image.mode in ('RGBA', 'P'):
            image = image.convert('RGB')
        
        img_width, img_height = image.size
        draw = ImageDraw.Draw(image)
        
        try:
            # Use Textract to extract text from the image
            response = textract.detect_document_text(
                Document={'Bytes': image_bytes}
            )
            
            # Process each text block
            for block in response.get('Blocks', []):
                if block['BlockType'] in ['LINE', 'WORD']:
                    text = block.get('Text', '')
                    if text:
                        extracted_text.append(text)
                        
                        # Check if this text block contains sensitive data
                        if is_sensitive_text(text) and 'Geometry' in block:
                            bbox = block['Geometry']['BoundingBox']
                            # Convert normalized coordinates to pixel coordinates
                            left = int(bbox['Left'] * img_width)
                            top = int(bbox['Top'] * img_height)
                            width = int(bbox['Width'] * img_width)
                            height = int(bbox['Height'] * img_height)
                            
                            # Add padding around the region
                            padding = 5
                            left = max(0, left - padding)
                            top = max(0, top - padding)
                            right = min(img_width, left + width + padding * 2)
                            bottom = min(img_height, top + height + padding * 2)
                            
                            # Draw black rectangle over sensitive area
                            draw.rectangle([left, top, right, bottom], fill=(0, 0, 0))
            
            # Mask sensitive data in extracted text for storage
            full_text = '\n'.join(extracted_text)
            masked_text = mask_sensitive_data(full_text)
            
        except Exception as textract_error:
            # If Textract fails, still add watermark but note the error
            masked_text = f"OCR failed: {str(textract_error)}"
        
        # Add watermark regardless of OCR success
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
        except:
            font = ImageFont.load_default()
        
        watermark_text = "ID PROCESSED"
        text_bbox = draw.textbbox((0, 0), watermark_text, font=font)
        text_width = text_bbox[2] - text_bbox[0]
        x_pos = (img_width - text_width) // 2
        
        # Draw watermark with red background at top
        draw.rectangle([x_pos - 8, 3, x_pos + text_width + 8, 22], fill=(200, 0, 0))
        draw.text((x_pos, 5), watermark_text, font=font, fill=(255, 255, 255))
        
        # Save processed image
        output_buffer = BytesIO()
        image.save(output_buffer, format='JPEG', quality=85, optimize=True)
        output_buffer.seek(0)
        
        return output_buffer.getvalue(), masked_text
        
    except Exception as e:
        # Return original image if everything fails
        return image_bytes, f"Processing failed: {str(e)}"

def validate_face_in_photo(image_bytes, is_id_card=False):
    """
    Validate that a face is properly captured in the photo using OpenCV.
    For ID cards, uses relaxed parameters since the face on ID is smaller.
    """
    try:
        # Convert image bytes to OpenCV format
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return False, "Invalid image format"
        
        # Convert to grayscale for face detection
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Load Haar cascade for face detection
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        # Use different parameters for ID card vs live photo
        if is_id_card:
            # Relaxed parameters for ID card - smaller faces, more sensitive detection
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.05,  # More sensitive
                minNeighbors=3,    # Lower threshold
                minSize=(20, 20), # Smaller minimum face size
                flags=cv2.CASCADE_SCALE_IMAGE
            )
        else:
            # Standard parameters for live photo
            faces = face_cascade.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
        
        if len(faces) == 0:
            error_msg = "No face detected on the ID card. Please ensure the ID photo is clearly visible" if is_id_card else "No face detected in the image"
            return False, error_msg
        
        # For ID cards, allow multiple faces (some IDs have multiple photos)
        # For live photos, require exactly one face
        if not is_id_card and len(faces) > 1:
            return False, "Multiple faces detected. Please ensure only one person is in the photo"
        
        # Get the largest detected face (most likely the main photo on ID)
        if len(faces) > 1:
            faces = sorted(faces, key=lambda f: f[2] * f[3], reverse=True)
        
        x, y, w, h = faces[0]
        
        # Calculate face area relative to image size
        image_height, image_width = image.shape[:2]
        face_area_ratio = (w * h) / (image_width * image_height)
        
        if is_id_card:
            # Relaxed size checks for ID card photos
            if face_area_ratio < 0.005:  # Face too small (less than 0.5% of image)
                return False, "Face on ID card is too small. Please hold the ID closer to the camera"
            # No upper limit for ID cards - the photo might be a large portion of the card
        else:
            # Standard size checks for live photos
            if face_area_ratio < 0.04:
                return False, "Face is too small in the image. Please move closer to the camera"
            if face_area_ratio > 0.64:
                return False, "Face is too large in the image. Please move away from the camera"
            
            # Check face position (should be reasonably centered) - only for live photos
            face_center_x = x + w // 2
            face_center_y = y + h // 2
            image_center_x = image_width // 2
            image_center_y = image_height // 2
            
            x_deviation = abs(face_center_x - image_center_x) / image_width
            y_deviation = abs(face_center_y - image_center_y) / image_height
            
            if x_deviation > 0.3 or y_deviation > 0.3:
                return False, "Face should be centered in the image"
            
            # Eye detection only for live photos
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            face_roi = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=5)
            
            if len(eyes) < 2:
                return False, "Eyes not clearly visible. Please ensure good lighting and face the camera directly"
        
        # Calculate confidence score
        if is_id_card:
            confidence_score = min(100, (face_area_ratio * 5000) + 50)  # Adjusted for smaller faces
        else:
            eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
            face_roi = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(face_roi, scaleFactor=1.1, minNeighbors=5)
            confidence_score = min(100, (face_area_ratio * 1000) + (len(eyes) * 10))
        
        if not is_id_card and confidence_score < 80:
            return False, f"Face detection confidence too low: {confidence_score:.1f}%. Please ensure good lighting and clear visibility"
        
        success_msg = f"Face detected on ID card (confidence: {confidence_score:.1f}%)" if is_id_card else f"Face validation successful (confidence: {confidence_score:.1f}%)"
        return True, success_msg
        
    except Exception as e:
        return False, f"Face validation failed: {str(e)}"

def validate_id_card(image_bytes):
    """
    Comprehensive ID card validation:
    1. Check if image has rectangular/card-like aspect ratio
    2. Detect document/card edges
    3. Use Textract to verify text content
    4. Check for Indian ID card patterns (Aadhar, PAN, Voter ID, Driving License)
    
    Returns: (is_valid, message, id_type, confidence_score)
    """
    try:
        # Convert image bytes to OpenCV format
        nparr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if image is None:
            return False, "Invalid image format", None, 0
        
        image_height, image_width = image.shape[:2]
        aspect_ratio = image_width / image_height
        
        validation_score = 0
        validation_details = []
        detected_id_type = None
        
        # ============================================
        # 1. ASPECT RATIO CHECK (ID cards are typically rectangular)
        # ============================================
        # Standard ID card aspect ratios:
        # - Credit card size (ISO/IEC 7810 ID-1): 85.6mm × 53.98mm = 1.586
        # - Aadhar card: ~1.58
        # - PAN card: ~1.58
        # - Voter ID: ~1.5 to 1.6
        # - Driving License: ~1.5 to 1.6
        
        # Allow for some variation due to camera angle (1.2 to 2.0)
        if 1.2 <= aspect_ratio <= 2.0:
            validation_score += 15
            validation_details.append(f"Aspect ratio OK ({aspect_ratio:.2f})")
        elif 0.5 <= aspect_ratio <= 0.85:
            # Portrait orientation - card held vertically
            validation_score += 10
            validation_details.append(f"Portrait orientation detected ({aspect_ratio:.2f})")
        else:
            validation_details.append(f"Unusual aspect ratio ({aspect_ratio:.2f}) - may not be an ID card")
        
        # ============================================
        # 2. EDGE/RECTANGLE DETECTION
        # ============================================
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 50, 150)
        
        # Find contours
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # Look for rectangular contours (card-like shape)
        card_like_contour_found = False
        for contour in contours:
            # Approximate the contour
            peri = cv2.arcLength(contour, True)
            approx = cv2.approxPolyDP(contour, 0.02 * peri, True)
            
            # Check if it's a quadrilateral (4 corners)
            if len(approx) == 4:
                # Check if it covers a significant portion of the image
                contour_area = cv2.contourArea(contour)
                image_area = image_width * image_height
                area_ratio = contour_area / image_area
                
                if area_ratio > 0.3:  # Card should be at least 30% of image
                    card_like_contour_found = True
                    validation_score += 15
                    validation_details.append(f"Card-like rectangle detected (covers {area_ratio*100:.1f}% of image)")
                    break
        
        if not card_like_contour_found:
            validation_details.append("No clear card boundary detected - ensure ID card is fully visible")
        
        # ============================================
        # 3. TEXT DETECTION USING TEXTRACT
        # ============================================
        try:
            textract_response = textract.detect_document_text(
                Document={'Bytes': image_bytes}
            )
            
            extracted_lines = []
            word_count = 0
            
            for block in textract_response.get('Blocks', []):
                if block['BlockType'] == 'LINE':
                    extracted_lines.append(block.get('Text', '').upper())
                elif block['BlockType'] == 'WORD':
                    word_count += 1
            
            full_text = ' '.join(extracted_lines)
            
            # Check minimum text content
            if word_count >= 5:
                validation_score += 10
                validation_details.append(f"Text detected ({word_count} words)")
            else:
                validation_details.append(f"Insufficient text detected ({word_count} words) - ensure ID is clearly visible")
            
            # ============================================
            # 4. INDIAN ID CARD PATTERN DETECTION
            # ============================================
            
            # --- AADHAR CARD ---
            aadhar_indicators = [
                'AADHAAR', 'AADHAR', 'UIDAI', 'UNIQUE IDENTIFICATION',
                'GOVERNMENT OF INDIA', 'GOI', 'आधार', 'भारत सरकार'
            ]
            aadhar_number_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
            
            aadhar_score = 0
            for indicator in aadhar_indicators:
                if indicator in full_text:
                    aadhar_score += 20
            if re.search(aadhar_number_pattern, full_text):
                aadhar_score += 30
            
            # --- PAN CARD ---
            pan_indicators = [
                'INCOME TAX', 'PERMANENT ACCOUNT NUMBER', 'PAN',
                'GOVT. OF INDIA', 'GOVT OF INDIA', 'आयकर विभाग'
            ]
            pan_number_pattern = r'\b[A-Z]{5}\d{4}[A-Z]\b'
            
            pan_score = 0
            for indicator in pan_indicators:
                if indicator in full_text:
                    pan_score += 20
            if re.search(pan_number_pattern, full_text):
                pan_score += 30
            
            # --- VOTER ID (EPIC) ---
            voter_indicators = [
                'ELECTION COMMISSION', 'VOTER', 'EPIC', 'ELECTORAL',
                'ELECTORS PHOTO', 'निर्वाचन आयोग', 'मतदाता'
            ]
            voter_id_pattern = r'\b[A-Z]{3}\d{7}\b'
            
            voter_score = 0
            for indicator in voter_indicators:
                if indicator in full_text:
                    voter_score += 20
            if re.search(voter_id_pattern, full_text):
                voter_score += 30
            
            # --- DRIVING LICENSE ---
            dl_indicators = [
                'DRIVING', 'LICENCE', 'LICENSE', 'TRANSPORT',
                'MOTOR VEHICLE', 'DL NO', 'ड्राइविंग', 'लाइसेंस'
            ]
            dl_pattern = r'\b[A-Z]{2}\d{2}\s?\d{4}\d{7}\b'  # Common DL format
            
            dl_score = 0
            for indicator in dl_indicators:
                if indicator in full_text:
                    dl_score += 20
            if re.search(dl_pattern, full_text):
                dl_score += 30
            
            # --- PASSPORT ---
            passport_indicators = [
                'PASSPORT', 'REPUBLIC OF INDIA', 'NATIONALITY',
                'INDIAN', 'पासपोर्ट', 'भारतीय गणराज्य'
            ]
            passport_pattern = r'\b[A-Z]\d{7}\b'
            
            passport_score = 0
            for indicator in passport_indicators:
                if indicator in full_text:
                    passport_score += 20
            if re.search(passport_pattern, full_text):
                passport_score += 25
            
            # Determine the most likely ID type
            id_scores = {
                'AADHAR': aadhar_score,
                'PAN': pan_score,
                'VOTER_ID': voter_score,
                'DRIVING_LICENSE': dl_score,
                'PASSPORT': passport_score
            }
            
            max_id_type = max(id_scores, key=id_scores.get)
            max_id_score = id_scores[max_id_type]
            
            if max_id_score >= 30:
                detected_id_type = max_id_type
                validation_score += min(40, max_id_score)
                validation_details.append(f"ID type detected: {max_id_type} (confidence: {max_id_score})")
            else:
                # Check for generic ID indicators
                generic_indicators = ['NAME', 'DOB', 'DATE OF BIRTH', 'ADDRESS', 'PHOTO', 'SIGNATURE']
                generic_count = sum(1 for ind in generic_indicators if ind in full_text)
                
                if generic_count >= 2:
                    validation_score += 15
                    detected_id_type = 'UNKNOWN_ID'
                    validation_details.append(f"Generic ID features detected ({generic_count} indicators)")
                else:
                    validation_details.append("No recognized ID card pattern found")
            
        except Exception as textract_error:
            validation_details.append(f"Text extraction failed: {str(textract_error)}")
        
        # ============================================
        # 5. FINAL VALIDATION DECISION
        # ============================================
        # Minimum score threshold: 40 (out of 100)
        # - Aspect ratio: up to 15
        # - Rectangle detection: up to 15
        # - Text detection: up to 10
        # - ID pattern match: up to 40
        
        is_valid = validation_score >= 40
        
        if is_valid:
            message = f"Valid ID card detected ({detected_id_type or 'Unknown type'}). Validation score: {validation_score}/100"
        else:
            message = f"Image does not appear to be a valid ID card. Score: {validation_score}/100. Issues: {'; '.join(validation_details)}"
        
        return is_valid, message, detected_id_type, validation_score
        
    except Exception as e:
        return False, f"ID card validation failed: {str(e)}", None, 0

def add_watermark_high_quality(image_bytes, timestamp_text, output_quality=HIGH_QUALITY_OUTPUT):
    """
    Add timestamp watermark to image while preserving high quality.
    Used for pre-test identity verification photos.
    """
    # Open the image
    image = Image.open(BytesIO(image_bytes))
    
    # Convert to RGB if necessary (for JPEG output)
    if image.mode in ('RGBA', 'P'):
        image = image.convert('RGB')
    
    # Create a drawing context
    draw = ImageDraw.Draw(image)
    
    # Get image dimensions
    img_width, img_height = image.size
    
    # Try to use a font, fall back to default if not available
    try:
        font_size = max(16, img_width // 30)
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
    except:
        font = ImageFont.load_default()
    
    # Watermark text with timestamp
    watermark_text = f"HR ROBOTS - {timestamp_text}"
    
    # Get text bounding box
    bbox = draw.textbbox((0, 0), watermark_text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    # Add timestamp at the bottom with semi-transparent background
    x_pos = (img_width - text_width) // 2
    y_pos = img_height - text_height - 15
    
    # Draw bottom timestamp with background
    draw.rectangle([x_pos - 8, y_pos - 5, x_pos + text_width + 8, y_pos + text_height + 5], fill=(0, 0, 0, 180))
    draw.text((x_pos, y_pos), watermark_text, font=font, fill=(255, 255, 255))
    
    # Save with high quality
    output_buffer = BytesIO()
    image.save(output_buffer, format='JPEG', quality=output_quality, optimize=True)
    output_buffer.seek(0)
    
    return output_buffer.getvalue()

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

        # Capture types that are screenshots (not webcam photos) - skip face validation for these
        screenshot_capture_types = [
            'consent_screenshot',
            'final_submission_screenshot',
            'fullscreen',
            'blur',
            'screenshot'
        ]
        
        # Proctor capture types from webcam - save even if face validation fails
        # These are monitoring captures during the test, not identity verification
        proctor_capture_types = [
            'initial',
            'interval', 
            'low_confidence',
            'multiple_faces',
            'routine'
        ]
        
        # Check capture type category
        capture_type_lower = capture_type.lower() if capture_type else ''
        is_screenshot_capture = capture_type_lower in [ct.lower() for ct in screenshot_capture_types]
        is_proctor_capture = capture_type_lower in [ct.lower() for ct in proctor_capture_types]
        
        # If no captureType but low outputQuality (<=50), treat as proctor capture
        # This handles legacy calls that don't send captureType
        if not capture_type and output_quality <= 50:
            is_proctor_capture = True

        # Process based on type
        if processing_type == 'ID':
            # Step 1: Validate that this is actually an ID card
            id_valid, id_validation_message, detected_id_type, id_confidence = validate_id_card(image_bytes)
            
            if not id_valid:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'ID card validation failed',
                        'message': id_validation_message
                    })
                }
            
            # Step 2: Validate that a face is present on the ID card
            face_valid, face_validation_message = validate_face_in_photo(image_bytes, is_id_card=True)
            
            if not face_valid:
                return {
                    'statusCode': 400,
                    'body': json.dumps({
                        'error': 'Face validation failed',
                        'message': face_validation_message
                    })
                }
            
            # Process ID card with OCR and masking
            processed_image_bytes, extracted_text = process_id_card_ocr(image_bytes)
            filename = f"id_card_{detected_id_type or 'unknown'}_{uuid.uuid4().hex}.jpg"
            processing_result = {
                'type': 'ID_CARD',
                'id_type': detected_id_type,
                'id_validation_score': id_confidence,
                'extracted_text': extracted_text,
                'face_validation': face_validation_message,
                'id_validation': id_validation_message,
                'message': f'ID card ({detected_id_type or "Unknown"}) processed successfully - face detected and sensitive data masked'
            }
            
        elif processing_type == 'PHOTO':
            # Skip face validation for screenshot captures (they don't contain webcam photos)
            if is_screenshot_capture:
                # For screenshots: just add watermark, no face validation
                processed_image_bytes = add_watermark_and_reduce_quality(image_bytes, current_timestamp, output_quality)
                filename = f"screenshot_{uuid.uuid4().hex}.jpg"
                processing_result = {
                    'type': 'SCREENSHOT',
                    'face_validation': 'Skipped - screenshot capture',
                    'quality': 'low',
                    'message': 'Screenshot captured successfully'
                }
            elif is_proctor_capture:
                # For proctor captures: save regardless of face validation (monitoring purposes)
                # Still attempt face validation for logging, but don't reject
                face_valid, validation_message = validate_face_in_photo(image_bytes)
                
                # Always save proctor captures with low quality watermark
                processed_image_bytes = add_watermark_and_reduce_quality(image_bytes, current_timestamp, output_quality)
                capture_label = capture_type_lower if capture_type_lower else 'monitoring'
                filename = f"proctor_{capture_label}_{uuid.uuid4().hex}.jpg"
                processing_result = {
                    'type': 'PROCTOR_CAPTURE',
                    'face_validation': validation_message,
                    'face_detected': face_valid,
                    'quality': 'low',
                    'message': f'Proctor capture saved ({capture_label})'
                }
            else:
                # For pre-test identity photos: strict face validation required
                face_valid, validation_message = validate_face_in_photo(image_bytes)
                
                if not face_valid:
                    return {
                        'statusCode': 400,
                        'body': json.dumps({
                            'error': 'Face validation failed',
                            'message': validation_message
                        })
                    }
                
                # Pre-test identity photos: high quality with watermark
                processed_image_bytes = add_watermark_high_quality(image_bytes, current_timestamp, HIGH_QUALITY_OUTPUT)
                
                filename = f"face_capture_{uuid.uuid4().hex}.jpg"
                processing_result = {
                    'type': 'PHOTO',
                    'face_validation': validation_message,
                    'quality': 'high',
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
            item_data['faceValidation'] = face_validation_message
            item_data['idValidation'] = id_validation_message
            item_data['idType'] = detected_id_type or 'Unknown'
            item_data['idConfidenceScore'] = id_confidence
        elif processing_type == 'PHOTO':
            item_data['faceValidation'] = processing_result.get('face_validation', 'N/A')
            
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
