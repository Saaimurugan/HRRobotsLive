# Deployment Guide

This guide will help you deploy HR Robots to your own AWS infrastructure.

## 📋 Prerequisites

- AWS Account with appropriate permissions
- Node.js 14+ installed
- AWS CLI configured
- Domain name (optional, for custom domain)

## 🚀 Quick Start Deployment

### Step 1: Clone and Install

```bash
git clone https://github.com/your-org/HRRobotsLive.git
cd HRRobotsLive
npm install
```

### Step 2: Configure Environment Variables

```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your values
nano .env
```

### Step 3: Set Up AWS Resources

#### A. Create DynamoDB Tables

```bash
# Users table
aws dynamodb create-table \
  --table-name Users \
  --attribute-definitions AttributeName=email,AttributeType=S \
  --key-schema AttributeName=email,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Templates table
aws dynamodb create-table \
  --table-name Templates \
  --attribute-definitions AttributeName=templateId,AttributeType=S \
  --key-schema AttributeName=templateId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Tests table
aws dynamodb create-table \
  --table-name Tests \
  --attribute-definitions AttributeName=testId,AttributeType=S \
  --key-schema AttributeName=testId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Questions table
aws dynamodb create-table \
  --table-name Questions \
  --attribute-definitions AttributeName=questionId,AttributeType=S \
  --key-schema AttributeName=questionId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# Answers table
aws dynamodb create-table \
  --table-name Answers \
  --attribute-definitions AttributeName=answerId,AttributeType=S \
  --key-schema AttributeName=answerId,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

#### B. Create S3 Buckets

```bash
# Bucket for candidate photos
aws s3 mb s3://your-hrrobots-photos

# Bucket for documents
aws s3 mb s3://your-hrrobots-documents

# Bucket for frontend hosting
aws s3 mb s3://your-hrrobots-frontend

# Enable static website hosting
aws s3 website s3://your-hrrobots-frontend \
  --index-document index.html \
  --error-document index.html
```

#### C. Set Up IAM Role for Lambda

Create a file `lambda-trust-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

Create the role:
```bash
aws iam create-role \
  --role-name HRRobotsLambdaRole \
  --assume-role-policy-document file://lambda-trust-policy.json

# Attach policies
aws iam attach-role-policy \
  --role-name HRRobotsLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

aws iam attach-role-policy \
  --role-name HRRobotsLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

aws iam attach-role-policy \
  --role-name HRRobotsLambdaRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonS3FullAccess
```

### Step 4: Deploy Lambda Functions

Each Lambda function in the `backend/` folder needs to be deployed:

```bash
# Example: Deploy login function
cd backend/login
zip -r function.zip .
aws lambda create-function \
  --function-name login \
  --runtime nodejs18.x \
  --role arn:aws:iam::YOUR_ACCOUNT_ID:role/HRRobotsLambdaRole \
  --handler index.handler \
  --zip-file fileb://function.zip \
  --timeout 30 \
  --memory-size 256

cd ../..
```

**Automated deployment script** (create `deploy-lambdas.sh`):
```bash
#!/bin/bash
ROLE_ARN="arn:aws:iam::YOUR_ACCOUNT_ID:role/HRRobotsLambdaRole"

for dir in backend/*/; do
  func_name=$(basename "$dir")
  echo "Deploying $func_name..."
  
  cd "$dir"
  zip -r function.zip . -x "*.git*" -x "config.json"
  
  # Check if function exists
  if aws lambda get-function --function-name "$func_name" 2>/dev/null; then
    # Update existing function
    aws lambda update-function-code \
      --function-name "$func_name" \
      --zip-file fileb://function.zip
  else
    # Create new function
    aws lambda create-function \
      --function-name "$func_name" \
      --runtime nodejs18.x \
      --role "$ROLE_ARN" \
      --handler index.handler \
      --zip-file fileb://function.zip \
      --timeout 30 \
      --memory-size 256
  fi
  
  rm function.zip
  cd ../..
done

echo "All Lambda functions deployed!"
```

Run it:
```bash
chmod +x deploy-lambdas.sh
./deploy-lambdas.sh
```

### Step 5: Set Up API Gateway

```bash
# Create REST API
aws apigateway create-rest-api \
  --name "HRRobots API" \
  --description "API for HR Robots platform" \
  --endpoint-configuration types=REGIONAL

# Note the API ID from the output
API_ID="your-api-id"

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --query 'items[0].id' \
  --output text)

# Create resources and methods for each Lambda function
# This is complex - consider using AWS SAM or Serverless Framework
```

**Recommended: Use AWS SAM or Serverless Framework** for easier API Gateway setup.

### Step 6: Build and Deploy Frontend

```bash
# Build React app
npm run build

# Sync to S3
aws s3 sync build/ s3://your-hrrobots-frontend --delete

# Make public (adjust as needed)
aws s3api put-bucket-policy \
  --bucket your-hrrobots-frontend \
  --policy file://bucket-policy.json
```

Create `bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-hrrobots-frontend/*"
    }
  ]
}
```

### Step 7: Set Up CloudFront (Optional but Recommended)

```bash
aws cloudfront create-distribution \
  --origin-domain-name your-hrrobots-frontend.s3.amazonaws.com \
  --default-root-object index.html
```

### Step 8: Configure Custom Domain (Optional)

1. Register domain in Route 53
2. Create SSL certificate in ACM
3. Point CloudFront to your domain
4. Update DNS records

## 🔧 Configuration

### Update API Endpoints

After deploying API Gateway, update your frontend code:

1. Get your API Gateway URL
2. Update in `.env`:
```
REACT_APP_API_GATEWAY_URL=https://your-api-id.execute-api.us-east-1.amazonaws.com/dev
```
3. Rebuild and redeploy frontend

### Configure CORS

Update Lambda functions to include CORS headers:
```javascript
return {
  statusCode: 200,
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
  },
  body: JSON.stringify(data)
};
```

## 📊 Monitoring and Logging

### Enable CloudWatch Logs

```bash
# Already enabled with AWSLambdaBasicExecutionRole
# View logs
aws logs tail /aws/lambda/login --follow
```

### Set Up CloudWatch Alarms

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name lambda-errors \
  --alarm-description "Alert on Lambda errors" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 1 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold
```

## 🔒 Security Hardening

1. **Enable encryption**
   - S3 bucket encryption
   - DynamoDB encryption at rest
   - SSL/TLS for API Gateway

2. **Set up WAF**
```bash
aws wafv2 create-web-acl \
  --name hrrobots-waf \
  --scope REGIONAL \
  --default-action Allow={} \
  --rules file://waf-rules.json
```

3. **Enable AWS Shield** (DDoS protection)

4. **Configure VPC** for Lambda functions (if needed)

## 💰 Cost Optimization

- Use S3 lifecycle policies
- Enable DynamoDB auto-scaling
- Set Lambda memory appropriately
- Use CloudFront caching
- Monitor with AWS Cost Explorer

## 🧪 Testing Deployment

```bash
# Test API endpoint
curl https://your-api-id.execute-api.us-east-1.amazonaws.com/dev/login

# Test frontend
curl https://your-hrrobots-frontend.s3.amazonaws.com/index.html
```

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to AWS

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: npm install
    
    - name: Build
      run: npm run build
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
    
    - name: Deploy to S3
      run: aws s3 sync build/ s3://your-hrrobots-frontend --delete
    
    - name: Invalidate CloudFront
      run: aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

## 📚 Additional Resources

- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [API Gateway Documentation](https://docs.aws.amazon.com/apigateway/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [S3 Documentation](https://docs.aws.amazon.com/s3/)

## 🆘 Troubleshooting

### Common Issues

1. **CORS errors**: Check Lambda response headers
2. **Lambda timeout**: Increase timeout or optimize code
3. **Permission errors**: Review IAM policies
4. **High costs**: Check CloudWatch metrics and optimize

---

For support, open an issue on GitHub or refer to AWS documentation.
