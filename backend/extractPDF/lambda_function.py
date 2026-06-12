# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import base64
import io

# Try importing PyPDF2
try:
    from PyPDF2 import PdfReader
    HAS_PYPDF2 = True
except ImportError:
    HAS_PYPDF2 = False
    print("PyPDF2 not available, using Textract")

# AWS Textract client
textract = boto3.client('textract', region_name='us-east-1')

def extract_with_pypdf2(pdf_bytes):
    """Extract text using PyPDF2"""
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        reader = PdfReader(pdf_file)
        
        text = ''
        for page in reader.pages:
            text += page.extract_text() + '\n'
        
        return text.strip()
    except Exception as e:
        print(f"PyPDF2 extraction failed: {str(e)}")
        return None

def extract_with_textract(pdf_bytes):
    """Extract text using AWS Textract"""
    try:
        response = textract.detect_document_text(
            Document={'Bytes': pdf_bytes}
        )
        
        text = ''
        for item in response['Blocks']:
            if item['BlockType'] == 'LINE':
                text += item['Text'] + '\n'
        
        return text.strip()
    except Exception as e:
        print(f"Textract extraction failed: {str(e)}")
        return None

def lambda_handler(event, context):
    """
    Extract text from PDF file
    Accepts base64 encoded PDF content
    """
    try:
        # Parse request
        body = json.loads(event.get('body', '{}')) if isinstance(event.get('body'), str) else event
        
        file_content = body.get('fileContent')
        file_name = body.get('fileName', 'document.pdf')
        
        if not file_content:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Missing file content'
                })
            }
        
        # Decode base64
        try:
            pdf_bytes = base64.b64decode(file_content)
        except Exception as e:
            return {
                'statusCode': 400,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Invalid base64 encoding',
                    'error': str(e)
                })
            }
        
        # Try extraction methods
        extracted_text = None
        
        # Method 1: PyPDF2 (faster, cheaper)
        if HAS_PYPDF2:
            extracted_text = extract_with_pypdf2(pdf_bytes)
        
        # Method 2: AWS Textract (more accurate, costs $)
        if not extracted_text:
            extracted_text = extract_with_textract(pdf_bytes)
        
        if not extracted_text:
            return {
                'statusCode': 500,
                'headers': {
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type',
                    'Access-Control-Allow-Methods': 'POST, OPTIONS'
                },
                'body': json.dumps({
                    'message': 'Failed to extract text from PDF'
                })
            }
        
        # Clean up text
        extracted_text = ' '.join(extracted_text.split())  # Remove extra whitespace
        
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'PDF text extracted successfully',
                'text': extracted_text,
                'fileName': file_name,
                'textLength': len(extracted_text)
            })
        }
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'POST, OPTIONS'
            },
            'body': json.dumps({
                'message': 'Internal server error',
                'error': str(e)
            })
        }
