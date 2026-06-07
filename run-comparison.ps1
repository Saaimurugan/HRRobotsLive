# PowerShell script to set AWS credentials and run comparison

# Prompt for AWS credentials
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "AWS Credentials Setup" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

$AWS_ACCESS_KEY_ID = Read-Host "Enter your AWS Access Key ID"
$AWS_SECRET_ACCESS_KEY = Read-Host "Enter your AWS Secret Access Key" -AsSecureString
$AWS_DEFAULT_REGION = Read-Host "Enter AWS region (default: us-east-1)"

# Set default region if not provided
if ([string]::IsNullOrWhiteSpace($AWS_DEFAULT_REGION)) {
    $AWS_DEFAULT_REGION = "us-east-1"
}

# Convert secure string to plain text for AWS_SECRET_ACCESS_KEY
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($AWS_SECRET_ACCESS_KEY)
$PlainSecretKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

Write-Host ""
Write-Host "Setting environment variables..." -ForegroundColor Yellow

# Set environment variables for current session
$env:AWS_ACCESS_KEY_ID = $AWS_ACCESS_KEY_ID
$env:AWS_SECRET_ACCESS_KEY = $PlainSecretKey
$env:AWS_DEFAULT_REGION = $AWS_DEFAULT_REGION

Write-Host "✓ Credentials configured" -ForegroundColor Green
Write-Host ""
Write-Host "Running Lambda comparison..." -ForegroundColor Yellow
Write-Host ""

# Run the comparison script
python compare-lambda-code.py

# Clean up sensitive variable
Remove-Variable PlainSecretKey
[System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
