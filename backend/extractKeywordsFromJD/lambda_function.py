import json
import boto3
import os

# Initialize Bedrock client
bedrock_runtime = boto3.client(
    service_name='bedrock-runtime',
    region_name='us-east-1'
)

def lambda_handler(event, context):
    try:
        jd_text = event.get('jdText', '')
        
        if not jd_text:
            return {
                'statusCode': 400,
                'body': json.dumps({'message': 'Missing Job Description in the request.'})
            }
        
        # Prepare prompt for keyword extraction
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

        # Call Bedrock Claude model
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [
                {
                    "role": "user",
                    "content": prompt
                }
            ]
        })
        
        response = bedrock_runtime.invoke_model(
            modelId='anthropic.claude-3-haiku-20240307-v1:0',
            body=body,
            contentType='application/json',
            accept='application/json'
        )
        
        response_body = json.loads(response['body'].read())
        assistant_message = response_body['content'][0]['text']
        
        # Parse the JSON response
        # Clean up the response in case there's extra text
        json_start = assistant_message.find('[')
        json_end = assistant_message.rfind(']') + 1
        
        if json_start != -1 and json_end > json_start:
            json_str = assistant_message[json_start:json_end]
            keywords = json.loads(json_str)
        else:
            # Fallback: try to parse the whole response
            keywords = json.loads(assistant_message)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'keywords': keywords,
                'message': 'Keywords extracted successfully'
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
