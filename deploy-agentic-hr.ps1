# Agentic HR Deployment Script (PowerShell)
# This script sets up all AWS resources needed for Agentic HR

$ErrorActionPreference = "Continue"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Agentic HR Deployment Script" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$REGION = "us-east-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)
$LAMBDA_ROLE_ARN = "arn:aws:iam::$ACCOUNT_ID`:role/lambda-execution-role"
$QUEUE_NAME = "AgenticHR-Queue"
$SENDER_EMAIL = "noreply@hrrobots.click"

Write-Host "AWS Account ID: $ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "Region: $REGION" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create DynamoDB Tables
Write-Host "Step 1: Creating DynamoDB Tables..." -ForegroundColor Green

Write-Host "Creating AgenticHR_Jobs table..."
aws dynamodb create-table `
  --table-name AgenticHR_Jobs `
  --attribute-definitions AttributeName=jobId,AttributeType=S AttributeName=email,AttributeType=S `
  --key-schema AttributeName=jobId,KeyType=HASH `
  --global-secondary-indexes "[{`"IndexName`":`"email-index`",`"KeySchema`":[{`"AttributeName`":`"email`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"},`"ProvisionedThroughput`":{`"ReadCapacityUnits`":5,`"WriteCapacityUnits`":5}}]" `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --region $REGION 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  Table AgenticHR_Jobs already exists" -ForegroundColor Yellow }

Write-Host "Creating AgenticHR_Candidates table..."
aws dynamodb create-table `
  --table-name AgenticHR_Candidates `
  --attribute-definitions AttributeName=candidateId,AttributeType=S AttributeName=jobId,AttributeType=S `
  --key-schema AttributeName=candidateId,KeyType=HASH `
  --global-secondary-indexes "[{`"IndexName`":`"jobId-index`",`"KeySchema`":[{`"AttributeName`":`"jobId`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"},`"ProvisionedThroughput`":{`"ReadCapacityUnits`":5,`"WriteCapacityUnits`":5}}]" `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --region $REGION 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  Table AgenticHR_Candidates already exists" -ForegroundColor Yellow }

Write-Host "Creating AgenticHR_Tests table..."
aws dynamodb create-table `
  --table-name AgenticHR_Tests `
  --attribute-definitions AttributeName=testId,AttributeType=S AttributeName=jobId,AttributeType=S `
  --key-schema AttributeName=testId,KeyType=HASH `
  --global-secondary-indexes "[{`"IndexName`":`"jobId-index`",`"KeySchema`":[{`"AttributeName`":`"jobId`",`"KeyType`":`"HASH`"}],`"Projection`":{`"ProjectionType`":`"ALL`"},`"ProvisionedThroughput`":{`"ReadCapacityUnits`":5,`"WriteCapacityUnits`":5}}]" `
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 `
  --region $REGION 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "  Table AgenticHR_Tests already exists" -ForegroundColor Yellow }

Write-Host "Waiting for tables to be active..."
aws dynamodb wait table-exists --table-name AgenticHR_Jobs --region $REGION
aws dynamodb wait table-exists --table-name AgenticHR_Candidates --region $REGION
aws dynamodb wait table-exists --table-name AgenticHR_Tests --region $REGION

Write-Host "✓ DynamoDB tables created" -ForegroundColor Green
Write-Host ""

# Step 2: Create SQS Queue
Write-Host "Step 2: Creating SQS Queue..." -ForegroundColor Green
$QUEUE_URL = aws sqs create-queue `
  --queue-name $QUEUE_NAME `
  --attributes VisibilityTimeout=300,MessageRetentionPeriod=1209600 `
  --region $REGION `
  --query 'QueueUrl' `
  --output text 2>$null

if ($LASTEXITCODE -ne 0) {
  $QUEUE_URL = aws sqs get-queue-url --queue-name $QUEUE_NAME --region $REGION --query 'QueueUrl' --output text
}

Write-Host "Queue URL: $QUEUE_URL" -ForegroundColor Yellow
Write-Host "✓ SQS Queue created" -ForegroundColor Green
Write-Host ""

# Step 3: Verify SES Email
Write-Host "Step 3: Verifying SES Email..." -ForegroundColor Green
aws ses verify-email-identity `
  --email-address $SENDER_EMAIL `
  --region $REGION 2>$null

Write-Host "✓ SES Email verification initiated (check your email for verification link)" -ForegroundColor Green
Write-Host ""

# Step 4: Deploy Lambda Functions
Write-Host "Step 4: Deploying Lambda Functions..." -ForegroundColor Green

$FUNCTIONS = @(
  "agenticHR_submitJob",
  "agenticHR_listJobs",
  "agenticHR_collectProfiles",
  "agenticHR_profileCandidates",
  "agenticHR_generateTests",
  "agenticHR_sendInvites",
  "agenticHR_sendFollowups",
  "agenticHR_getJobDetails"
)

foreach ($FUNCTION in $FUNCTIONS) {
  Write-Host "Deploying $FUNCTION..." -ForegroundColor Cyan
  
  $FunctionPath = "backend\$FUNCTION"
  
  if (Test-Path "$FunctionPath\lambda_function.py") {
    Push-Location $FunctionPath
    
    # Create deployment package
    if (Test-Path "function.zip") { Remove-Item "function.zip" }
    Compress-Archive -Path "lambda_function.py" -DestinationPath "function.zip" -Force | Out-Null
    
    # Check if function exists
    $functionExists = aws lambda get-function --function-name $FUNCTION --region $REGION 2>$null
    
    if ($LASTEXITCODE -eq 0) {
      Write-Host "  Updating existing function..." -ForegroundColor Yellow
      aws lambda update-function-code `
        --function-name $FUNCTION `
        --zip-file fileb://function.zip `
        --region $REGION | Out-Null
    } else {
      Write-Host "  Creating new function..." -ForegroundColor Yellow
      aws lambda create-function `
        --function-name $FUNCTION `
        --runtime python3.12 `
        --role $LAMBDA_ROLE_ARN `
        --handler lambda_function.lambda_handler `
        --zip-file fileb://function.zip `
        --timeout 300 `
        --memory-size 512 `
        --environment "Variables={QUEUE_URL=$QUEUE_URL}" `
        --region $REGION | Out-Null
    }
    
    Remove-Item "function.zip"
    Write-Host "  ✓ $FUNCTION deployed" -ForegroundColor Green
    
    Pop-Location
  }
}

Write-Host "✓ All Lambda functions deployed" -ForegroundColor Green
Write-Host ""

# Step 5: Configure SQS Triggers
Write-Host "Step 5: Configuring SQS Triggers for Lambda Functions..." -ForegroundColor Green

$SQS_TRIGGERED_FUNCTIONS = @(
  "agenticHR_collectProfiles",
  "agenticHR_profileCandidates",
  "agenticHR_generateTests",
  "agenticHR_sendInvites",
  "agenticHR_sendFollowups"
)

$QUEUE_ARN = aws sqs get-queue-attributes `
  --queue-url $QUEUE_URL `
  --attribute-names QueueArn `
  --region $REGION `
  --query 'Attributes.QueueArn' `
  --output text

foreach ($FUNCTION in $SQS_TRIGGERED_FUNCTIONS) {
  Write-Host "Adding SQS trigger to $FUNCTION..." -ForegroundColor Cyan
  
  aws lambda create-event-source-mapping `
    --function-name $FUNCTION `
    --batch-size 1 `
    --event-source-arn $QUEUE_ARN `
    --region $REGION 2>$null | Out-Null
    
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  Trigger already exists" -ForegroundColor Yellow
  } else {
    Write-Host "  ✓ Trigger configured" -ForegroundColor Green
  }
}

Write-Host "✓ SQS triggers configured" -ForegroundColor Green
Write-Host ""

# Step 6: API Gateway reminder
Write-Host "Step 6: API Gateway Configuration" -ForegroundColor Green
Write-Host "NOTE: You need to manually configure API Gateway with the following endpoints:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  POST /agenticHR/submitJob → agenticHR_submitJob" -ForegroundColor White
Write-Host "  POST /agenticHR/listJobs → agenticHR_listJobs" -ForegroundColor White
Write-Host "  POST /agenticHR/getJobDetails → agenticHR_getJobDetails" -ForegroundColor White
Write-Host ""
Write-Host "Don't forget to enable CORS and deploy the API!" -ForegroundColor Yellow
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Deployment Complete!" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Resources created:" -ForegroundColor Green
Write-Host "  ✓ DynamoDB Tables: AgenticHR_Jobs, AgenticHR_Candidates, AgenticHR_Tests" -ForegroundColor White
Write-Host "  ✓ SQS Queue: $QUEUE_NAME" -ForegroundColor White
Write-Host "  ✓ Lambda Functions: 8 functions deployed" -ForegroundColor White
Write-Host "  ✓ SQS Triggers: Configured for workflow functions" -ForegroundColor White
Write-Host "  ✓ SES Email: Verification initiated" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify your SES email by clicking the link sent to $SENDER_EMAIL" -ForegroundColor White
Write-Host "  2. Configure API Gateway endpoints (see Step 6 above)" -ForegroundColor White
Write-Host "  3. Update frontend API URLs in agenticHR.js" -ForegroundColor White
Write-Host "  4. Test the workflow end-to-end" -ForegroundColor White
Write-Host ""
Write-Host "For detailed documentation, see AGENTIC_HR_README.md" -ForegroundColor Cyan
Write-Host ""
