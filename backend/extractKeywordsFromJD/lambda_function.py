# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from datetime import datetime

def lambda_handler(event, context):
    try:
        # Initialize Bedrock Runtime client
        client = boto3.client("bedrock-runtime", region_name="us-east-1")

        LITE_MODEL_ID = "amazon.nova-micro-v1:0"

        jd_text = event.get('jdText', '')
        
        if not jd_text:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing Job Description in the request.'})
            }

        # Construct the prompt for keyword extraction
        prompt = f"""Analyze the following Job Description and extract the most important technical skills, technologies, and competencies that should be tested.

Job Description:
{jd_text}

Return a JSON array of keywords with suggested question counts. Focus on:
1. Programming languages and frameworks
2. Technical tools and platforms
3. Domain-specific knowledge
4. Soft skills that can be tested via MCQ

Return ONLY a valid JSON array in this exact format, no other text:
[
  {{"keyword": "Python", "suggestedCount": 5}},
  {{"keyword": "AWS", "suggestedCount": 5}},
  {{"keyword": "SQL", "suggestedCount": 3}}
]

Extract 5-15 most relevant keywords. Suggest 3-5 questions per keyword based on importance."""

        message_list = [
            {"role": "user", "content": [{"text": prompt}]}
        ]

        system_list = [{"text": "You are an expert HR assistant that extracts relevant technical keywords from job descriptions."}]

        inf_params = {"max_new_tokens": 2000, "top_p": 0.9, "top_k": 20, "temperature": 0.7}

        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }

        # Start time
        start_time = datetime.now()

        response = client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID,
            body=json.dumps(request_body)
        )

        request_id = response.get("ResponseMetadata", {}).get("RequestId", "N/A")
        stream = response.get("body")

        if not stream:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'No response received.',
                    'request_id': request_id
                })
            }

        response_data = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta

        # Parse the JSON response
        # Clean up the response in case there's extra text
        json_start = response_data.find('[')
        json_end = response_data.rfind(']') + 1
        
        if json_start != -1 and json_end > json_start:
            json_str = response_data[json_start:json_end]
            keywords = json.loads(json_str)
        else:
            # Fallback: try to parse the whole response
            keywords = json.loads(response_data)

        return {
            'statusCode': 200,
            'body': json.dumps({
                'keywords': keywords,
                'message': 'Keywords extracted successfully',
                'request_id': request_id
            })
        }

    except json.JSONDecodeError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Failed to parse AI response',
                'error': str(e)
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Error extracting keywords',
                'error': str(e)
            })
        }
