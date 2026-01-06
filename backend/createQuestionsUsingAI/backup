# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
import re
from datetime import datetime

def lambda_handler(event, context):
    try:
        # Create a Bedrock Runtime client in the AWS Region of your choice.
        client = boto3.client("bedrock-runtime", region_name="us-east-1")

        LITE_MODEL_ID = "amazon.nova-micro-v1:0"

        topic = event.get('topic', '')
        level = event.get('level', '')
        formattedQuestions = event.get('formattedQuestions', '')

        # Define system prompt
        message_list = [
            {
                "role": "user",
                "content": [{
                    "text": f"""Generate 20 MCQs with answers related to the topic:

                    "{topic}".

                    Level: {level}

                    Don't generate the questions below:
                    {formattedQuestions}

                    Use the following JSON format:

                    [
                        {{
                            "type": "mcq",
                            "question": "<Question>",
                            "options": [
                                "<option1>",
                                "<option2>",
                                "<option3>",
                                "<option4>"
                            ],
                            "correctAnswer": "<Correct option>"
                        }}
                    ]
                    """
                }]
            }
        ]

        system_list = [{"text": "You are a helpful assistant that generates educational questions in JSON format."}]

        # Configure inference parameters
        inf_params = {
            "max_new_tokens": 6000,
            "top_p": 0.9,
            "top_k": 20,
            "temperature": 0.7
        }

        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }

        start_time = datetime.now()

        # Invoke the model with response stream
        response = client.invoke_model_with_response_stream(
            modelId=LITE_MODEL_ID, body=json.dumps(request_body)
        )

        request_id = response.get("ResponseMetadata", {}).get("RequestId", "N/A")
        stream = response.get("body")

        if not stream:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Response not received, please contact support.',
                    'request_id': request_id
                })
            }

        # Collect response chunks
        response_data = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta  # Ensure response is clean

        # Debugging: Log raw response data
        print(f"Raw Response Data: {response_data}")
   
        return {
            'statusCode': 200,
            'body': json.dumps({
                'request_id': request_id,
                'data': response_data
            })
        }

    except json.JSONDecodeError as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': "JSON parsing error",
                'details': str(e)
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
