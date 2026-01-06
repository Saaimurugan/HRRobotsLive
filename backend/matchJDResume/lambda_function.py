# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. 
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from datetime import datetime

def lambda_handler(event, context):
    try:
        # Create a Bedrock Runtime client in the AWS Region of your choice.
        client = boto3.client("bedrock-runtime", region_name="us-east-1")

        LITE_MODEL_ID = "amazon.nova-micro-v1:0"

        resume = event.get('resume', '')
        job_description = event.get('jobDescription', '')

        # Define your system prompt(s).
        message_list = [
            {"role": "user", "content": [{
            "text": f"""
            You are an AI assistant tasked with analyzing a candidate's resume against a job description.

            Please review the candidate profile and job description below, then generate a JSON report with the following fields:

            - CandidateName: string
            - Summary: string
            - Suitability: percentage (e.g. "78%")
            - Matching: list of key matching skills
            - Gaps: list of skills or experience the candidate is missing
            - AdditionalStrengths: list of other strengths observed
            - ProjectRelavence: list describing relevance to the job/project
            - SuggestedImprovements: list of tips to better align with the job
            - Conclusion: a concise recommendation

            **Candidate Profile**:
            {resume}

            **Job Description**:
            {job_description}

            Please return only the JSON output. Do not include any explanations or headers.
            """
            }]}]

        # Define one or more messages using the "user" and "assistant" roles.
        system_list = [{"text": "You are a helpful assistant who checks job descriptions and candidates' profiles to provide a JSON report on suitability."}]

        # Configure the inference parameters.
        inf_params = {"max_new_tokens": 4000, "top_p": 0.9, "top_k": 20, "temperature": 0.7}

        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }

        start_time = datetime.now()

        # Invoke the model with the response stream
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

        # Collect the response chunks
        response_data = ""
        for event in stream:
            chunk = event.get("chunk")
            if chunk:
                chunk_json = json.loads(chunk.get("bytes").decode())
                content_block_delta = chunk_json.get("contentBlockDelta", {}).get("delta", {}).get("text", "")
                response_data += content_block_delta

        if response_data:
            try:
                parsed_response = json.loads(response_data)  # Ensure it returns valid JSON
            except json.JSONDecodeError:
                parsed_response = {"error": "Failed to parse model response as JSON", "raw_output": response_data}
        else:
            parsed_response = {"message": "No data received from model."}

        return {
            'statusCode': 200,
            'body': json.dumps({
                'request_id': request_id,
                'data': parsed_response
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e)
            })
        }
