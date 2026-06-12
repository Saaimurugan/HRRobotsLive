#!/bin/bash

# Agentic HR Deployment Script
# This script sets up all AWS resources needed for Agentic HR

set -e

echo "========================================="
echo "Agentic HR Deployment Script"
echo "========================================="
echo ""

# Configuration
REGION="us-east-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
LAMBDA_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/lambda-execution-role"
QUEUE_NAME="AgenticHR-Queue"
SENDER_EMAIL="noreply@hrrobots.click"

echo "AWS Account ID: ${ACCOUNT_ID}"
echo "Region: ${REGION}"
echo ""

# Step 1: Create DynamoDB Tables
echo "Step 1: Creating DynamoDB Tables..."

echo "Creating AgenticHR_Jobs table..."
aws dynamodb create-table \
  --table-name AgenticHR_Jobs \
  --attribute-definitions \
    AttributeName=jobId,AttributeType=S \
    AttributeName=email,AttributeType=S \
  --key-schema \
    AttributeName=jobId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"email-index\",\"KeySchema\":[{\"AttributeName\":\"email\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ${REGION} || echo "Table AgenticHR_Jobs already exists"

echo "Creating AgenticHR_Candidates table..."
aws dynamodb create-table \
  --table-name AgenticHR_Candidates \
  --attribute-definitions \
    AttributeName=candidateId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=candidateId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"jobId-index\",\"KeySchema\":[{\"AttributeName\":\"jobId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ${REGION} || echo "Table AgenticHR_Candidates already exists"

echo "Creating AgenticHR_Tests table..."
aws dynamodb create-table \
  --table-name AgenticHR_Tests \
  --attribute-definitions \
    AttributeName=testId,AttributeType=S \
    AttributeName=jobId,AttributeType=S \
  --key-schema \
    AttributeName=testId,KeyType=HASH \
  --global-secondary-indexes \
    "[{\"IndexName\":\"jobId-index\",\"KeySchema\":[{\"AttributeName\":\"jobId\",\"KeyType\":\"HASH\"}],\"Projection\":{\"ProjectionType\":\"ALL\"},\"ProvisionedThroughput\":{\"ReadCapacityUnits\":5,\"WriteCapacityUnits\":5}}]" \
  --provisioned-throughput \
    ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region ${REGION} || echo "Table AgenticHR_Tests already exists"

echo "Waiting for tables to be active..."
aws dynamodb wait table-exists --table-name AgenticHR_Jobs --region ${REGION}
aws dynamodb wait table-exists --table-name AgenticHR_Candidates --region ${REGION}
aws dynamodb wait table-exists --table-name AgenticHR_Tests --region ${REGION}

echo "✓ DynamoDB tables created"
echo ""

# Step 2: Create SQS Queue
echo "Step 2: Creating SQS Queue..."
QUEUE_URL=$(aws sqs create-queue \
  --queue-name ${QUEUE_NAME} \
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600 \
  --region ${REGION} \
  --query 'QueueUrl' \
  --output text 2>/dev/null || aws sqs get-queue-url --queue-name ${QUEUE_NAME} --region ${REGION} --query 'QueueUrl' --output text)

echo "Queue URL: ${QUEUE_URL}"
echo "✓ SQS Queue created"
echo ""

# Step 3: Verify SES Email
echo "Step 3: Verifying SES Email..."
aws ses verify-email-identity \
  --email-address ${SENDER_EMAIL} \
  --region ${REGION} || echo "Email already verified or verification initiated"

echo "✓ SES Email verification initiated (check your email for verification link)"
echo ""

# Step 4: Deploy Lambda Functions
echo "Step 4: Deploying Lambda Functions..."

FUNCTIONS=(
  "agenticHR_submitJob"
  "agenticHR_listJobs"
  "agenticHR_collectProfiles"
  "agenticHR_profileCandidates"
  "agenticHR_generateTests"
  "agenticHR_sendInvites"
  "agenticHR_sendFollowups"
  "agenticHR_getJobDetails"
)

for FUNCTION in "${FUNCTIONS[@]}"; do
  echo "Deploying ${FUNCTION}..."
  
  cd "backend/${FUNCTION}"
  
  # Create deployment package
  if [ -f "lambda_function.py" ]; then
    zip -r function.zip lambda_function.py > /dev/null
    
    # Update QUEUE_URL in config if needed
    sed -i "s|YOUR_ACCOUNT|${ACCOUNT_ID}|g" lambda_function.py
    
    # Create or update Lambda function
    aws lambda get-function --function-name ${FUNCTION} --region ${REGION} > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
      echo "  Updating existing function..."
      aws lambda update-function-code \
        --function-name ${FUNCTION} \
        --zip-file fileb://function.zip \
        --region ${REGION} > /dev/null
    else
      echo "  Creating new function..."
      aws lambda create-function \
        --function-name ${FUNCTION} \
        --runtime python3.12 \
        --role ${LAMBDA_ROLE_ARN} \
        --handler lambda_function.lambda_handler \
        --zip-file fileb://function.zip \
        --timeout 300 \
        --memory-size 512 \
        --environment Variables="{QUEUE_URL=${QUEUE_URL}}" \
        --region ${REGION} > /dev/null
    fi
    
    rm function.zip
    echo "  ✓ ${FUNCTION} deployed"
  fi
  
  cd ../..
done

echo "✓ All Lambda functions deployed"
echo ""

# Step 5: Configure SQS Triggers
echo "Step 5: Configuring SQS Triggers for Lambda Functions..."

SQS_TRIGGERED_FUNCTIONS=(
  "agenticHR_collectProfiles"
  "agenticHR_profileCandidates"
  "agenticHR_generateTests"
  "agenticHR_sendInvites"
  "agenticHR_sendFollowups"
)

QUEUE_ARN=$(aws sqs get-queue-attributes \
  --queue-url ${QUEUE_URL} \
  --attribute-names QueueArn \
  --region ${REGION} \
  --query 'Attributes.QueueArn' \
  --output text)

for FUNCTION in "${SQS_TRIGGERED_FUNCTIONS[@]}"; do
  echo "Adding SQS trigger to ${FUNCTION}..."
  
  # Add SQS as event source
  aws lambda create-event-source-mapping \
    --function-name ${FUNCTION} \
    --batch-size 1 \
    --event-source-arn ${QUEUE_ARN} \
    --region ${REGION} > /dev/null 2>&1 || echo "  Trigger already exists"
    
  echo "  ✓ Trigger configured"
done

echo "✓ SQS triggers configured"
echo ""

# Step 6: Create API Gateway (manual step reminder)
echo "Step 6: API Gateway Configuration"
echo "NOTE: You need to manually configure API Gateway with the following endpoints:"
echo ""
echo "  POST /agenticHR/submitJob → agenticHR_submitJob"
echo "  POST /agenticHR/listJobs → agenticHR_listJobs"
echo "  POST /agenticHR/getJobDetails → agenticHR_getJobDetails"
echo ""
echo "Don't forget to enable CORS and deploy the API!"
echo ""

# Summary
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "Resources created:"
echo "  ✓ DynamoDB Tables: AgenticHR_Jobs, AgenticHR_Candidates, AgenticHR_Tests"
echo "  ✓ SQS Queue: ${QUEUE_NAME}"
echo "  ✓ Lambda Functions: 8 functions deployed"
echo "  ✓ SQS Triggers: Configured for workflow functions"
echo "  ✓ SES Email: Verification initiated"
echo ""
echo "Next steps:"
echo "  1. Verify your SES email by clicking the link sent to ${SENDER_EMAIL}"
echo "  2. Configure API Gateway endpoints (see Step 6 above)"
echo "  3. Update frontend API URLs in agenticHR.js"
echo "  4. Test the workflow end-to-end"
echo ""
echo "For detailed documentation, see AGENTIC_HR_README.md"
echo ""
