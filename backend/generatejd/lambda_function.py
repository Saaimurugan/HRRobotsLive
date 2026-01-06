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

        # Extract data from event
        role = event.get("roleName", "")
        experience = event.get("yearsOfExperience", "")
        project = event.get("projectDetails", "")
        languages = event.get("languages", "")
        skills = event.get("additionalSkills", "")

        # Construct the prompt to generate HTML JD
        prompt = f'''
        You are an expert HR assistant. Generate a professional job description (JD) in HTML format using the details below, the JD should be details and contains About the Role, Key Responsibilities, Requirements, Must-Have Skills, Nice-to-Have Skills  :

        Role Name: {role}
        Years of Experience: {experience}
        Project Details: {project or "N/A"}
        Languages: {languages}
        Additional Skills: {skills}

        Format the JD using proper HTML tags including <h1>, <h2>, <ul>, <p>, etc.
        '''

        message_list = [
            {"role": "user", "content": [{"text": prompt}]}
        ]

        system_list = [{"text": "You are a helpful assistant that generates professional HTML job descriptions based on input data."}]

        inf_params = {"max_new_tokens": 5000, "top_p": 0.9, "top_k": 20, "temperature": 0.7}

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

        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'text/html'},
            'body': response_data
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }