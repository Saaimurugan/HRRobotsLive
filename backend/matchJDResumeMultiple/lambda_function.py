# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. 
# SPDX-License-Identifier: Apache-2.0
import boto3
import json
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

def analyze_single_resume(client, model_id, job_description, resume, resume_name):
    """
    Analyze a single resume against the job description.
    Returns the analysis report for one candidate.
    """
    try:
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

        system_list = [{"text": "You are a helpful assistant who checks job descriptions and candidates' profiles to provide a JSON report on suitability."}]

        inf_params = {"max_new_tokens": 4000, "top_p": 0.9, "top_k": 20, "temperature": 0.7}

        request_body = {
            "schemaVersion": "messages-v1",
            "messages": message_list,
            "system": system_list,
            "inferenceConfig": inf_params,
        }

        # Invoke the model with the response stream
        response = client.invoke_model_with_response_stream(
            modelId=model_id, body=json.dumps(request_body)
        )

        stream = response.get("body")
        
        if not stream:
            return {
                'resumeName': resume_name,
                'error': 'Response not received from AI model',
                'status': 'failed'
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
                # Strip markdown code blocks if present
                cleaned_response = response_data.strip()
                if cleaned_response.startswith("```json"):
                    cleaned_response = cleaned_response[7:]
                if cleaned_response.startswith("```"):
                    cleaned_response = cleaned_response[3:]
                if cleaned_response.endswith("```"):
                    cleaned_response = cleaned_response[:-3]
                cleaned_response = cleaned_response.strip()
                
                parsed_response = json.loads(cleaned_response)
                parsed_response['resumeName'] = resume_name
                parsed_response['status'] = 'success'
                return parsed_response
            except json.JSONDecodeError as e:
                return {
                    'resumeName': resume_name,
                    'error': f"Failed to parse AI response: {str(e)}",
                    'raw_output': response_data[:500],
                    'status': 'failed'
                }
        else:
            return {
                'resumeName': resume_name,
                'error': 'No data received from model',
                'status': 'failed'
            }
    
    except Exception as e:
        return {
            'resumeName': resume_name,
            'error': str(e),
            'status': 'failed'
        }


def lambda_handler(event, context):
    """
    Process multiple resumes against a single job description.
    Expects:
    {
        "jobDescription": "...",
        "resumes": [
            {"name": "candidate1.pdf", "text": "..."},
            {"name": "candidate2.pdf", "text": "..."}
        ],
        "token": "JWT_TOKEN"
    }
    """
    try:
        # Create a Bedrock Runtime client
        client = boto3.client("bedrock-runtime", region_name="us-east-1")
        MODEL_ID = "amazon.nova-lite-v1:0"

        job_description = event.get('jobDescription', '')
        resumes = event.get('resumes', [])
        
        if not job_description:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Job description is required'
                })
            }
        
        if not resumes or len(resumes) == 0:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'At least one resume is required'
                })
            }
        
        if len(resumes) > 50:
            return {
                'statusCode': 400,
                'body': json.dumps({
                    'message': 'Maximum 50 resumes can be processed at once'
                })
            }
        
        start_time = datetime.now()
        results = []
        
        # Process resumes in parallel using ThreadPoolExecutor
        max_workers = min(10, len(resumes))  # Process up to 10 resumes concurrently
        
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            # Submit all resume analysis tasks
            future_to_resume = {
                executor.submit(
                    analyze_single_resume,
                    client,
                    MODEL_ID,
                    job_description,
                    resume.get('text', ''),
                    resume.get('name', f'Resume {idx + 1}')
                ): resume for idx, resume in enumerate(resumes)
            }
            
            # Collect results as they complete
            for future in as_completed(future_to_resume):
                try:
                    result = future.result()
                    results.append(result)
                except Exception as e:
                    resume = future_to_resume[future]
                    results.append({
                        'resumeName': resume.get('name', 'Unknown'),
                        'error': f'Processing failed: {str(e)}',
                        'status': 'failed'
                    })
        
        # Calculate summary statistics
        total_processed = len(results)
        successful = sum(1 for r in results if r.get('status') == 'success')
        failed = total_processed - successful
        
        # Sort results by suitability if available
        def get_suitability_score(result):
            if result.get('status') != 'success':
                return -1
            suitability = result.get('Suitability', '0%')
            try:
                return int(suitability.replace('%', ''))
            except:
                return 0
        
        results.sort(key=get_suitability_score, reverse=True)
        
        processing_time = (datetime.now() - start_time).total_seconds()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'summary': {
                    'totalProcessed': total_processed,
                    'successful': successful,
                    'failed': failed,
                    'processingTimeSeconds': round(processing_time, 2)
                },
                'results': results,
                'message': f'Successfully processed {successful} out of {total_processed} resumes'
            })
        }
    
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'error': str(e),
                'message': 'Error processing multiple resumes'
            })
        }
