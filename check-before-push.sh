#!/bin/bash

# Security Check Script - Run before pushing to public repository
# This script checks for common security issues

echo "🔍 Running security checks before push..."
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Function to print error
error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    ((ERRORS++))
}

# Function to print warning
warning() {
    echo -e "${YELLOW}⚠️  WARNING: $1${NC}"
    ((WARNINGS++))
}

# Function to print success
success() {
    echo -e "${GREEN}✅ $1${NC}"
}

# 1. Check for AWS credentials in code
echo "1️⃣  Checking for AWS credentials..."
if grep -r "AKIA[0-9A-Z]{16}" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="check-before-push.sh" . > /dev/null 2>&1; then
    error "Found AWS access keys in code!"
    grep -r "AKIA[0-9A-Z]{16}" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" --exclude="check-before-push.sh" .
else
    success "No AWS credentials found in code"
fi
echo ""

# 2. Check for API keys
echo "2️⃣  Checking for API keys..."
if grep -r "api[_-]?key.*=.*['\"][a-zA-Z0-9]{20,}" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/ > /dev/null 2>&1; then
    warning "Found potential API keys in code"
    grep -r "api[_-]?key.*=" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/
else
    success "No hardcoded API keys found"
fi
echo ""

# 3. Check for hardcoded passwords
echo "3️⃣  Checking for passwords..."
if grep -r "password.*=.*['\"][^'\"]*['\"]" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/ | grep -v "password.*=.*['\"]['\"]" | grep -v "password.*=.*['\"][a-z]*['\"]" > /dev/null 2>&1; then
    warning "Found potential hardcoded passwords"
    grep -r "password.*=.*['\"]" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/ | head -5
else
    success "No hardcoded passwords found"
fi
echo ""

# 4. Check for .env files (should not be committed)
echo "4️⃣  Checking for .env files..."
if find . -name ".env" -not -path "*/node_modules/*" -not -name ".env.example" | grep -q .; then
    error "Found .env file(s) that might be committed!"
    find . -name ".env" -not -path "*/node_modules/*" -not -name ".env.example"
else
    success "No .env files found (good)"
fi
echo ""

# 5. Check for private keys
echo "5️⃣  Checking for private keys..."
if find . \( -name "*.pem" -o -name "*.key" \) -not -path "*/node_modules/*" | grep -q .; then
    error "Found private key files!"
    find . \( -name "*.pem" -o -name "*.key" \) -not -path "*/node_modules/*"
else
    success "No private key files found"
fi
echo ""

# 6. Check aws-credentials.txt
echo "6️⃣  Checking aws-credentials.txt..."
if [ -f "aws-credentials.txt" ]; then
    if grep -q "your_access_key_here" aws-credentials.txt && grep -q "your_secret_access_key_here" aws-credentials.txt; then
        success "aws-credentials.txt is using template values"
    elif grep -q "AKIA[0-9A-Z]{16}" aws-credentials.txt; then
        error "aws-credentials.txt contains real credentials!"
    else
        warning "aws-credentials.txt exists - ensure it's in .gitignore"
    fi
else
    success "aws-credentials.txt not found (good if using .env)"
fi
echo ""

# 7. Check gitignore
echo "7️⃣  Checking .gitignore..."
if [ -f ".gitignore" ]; then
    if grep -q "aws-credentials.txt" .gitignore && grep -q ".env" .gitignore; then
        success ".gitignore includes sensitive files"
    else
        warning ".gitignore might be missing sensitive files"
    fi
else
    error ".gitignore file not found!"
fi
echo ""

# 8. Check for TODO/FIXME comments
echo "8️⃣  Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/ 2>/dev/null | wc -l)
if [ "$TODO_COUNT" -gt 0 ]; then
    warning "Found $TODO_COUNT TODO/FIXME comments - consider addressing them"
else
    success "No TODO/FIXME comments found"
fi
echo ""

# 9. Check for console.log statements
echo "9️⃣  Checking for console.log statements..."
CONSOLE_COUNT=$(grep -r "console\.log" --include="*.js" --include="*.jsx" --exclude-dir=node_modules src/ 2>/dev/null | wc -l)
if [ "$CONSOLE_COUNT" -gt 10 ]; then
    warning "Found $CONSOLE_COUNT console.log statements - consider removing for production"
else
    success "Console.log usage is reasonable"
fi
echo ""

# 10. Run npm audit
echo "🔟 Running npm audit..."
if command -v npm &> /dev/null; then
    if npm audit --audit-level=high > /dev/null 2>&1; then
        success "No high-severity vulnerabilities found"
    else
        warning "Found security vulnerabilities - run 'npm audit' for details"
    fi
else
    warning "npm not found, skipping audit"
fi
echo ""

# 11. Check git status
echo "1️⃣1️⃣  Checking git status..."
if command -v git &> /dev/null; then
    UNTRACKED=$(git status --porcelain 2>/dev/null | grep "^??" | wc -l)
    if [ "$UNTRACKED" -gt 0 ]; then
        warning "Found $UNTRACKED untracked files - verify they should be committed"
        git status --porcelain | grep "^??"
    else
        success "No untracked files"
    fi
else
    warning "git not found"
fi
echo ""

# 12. Test build
echo "1️⃣2️⃣  Testing build..."
if command -v npm &> /dev/null; then
    if npm run build > /dev/null 2>&1; then
        success "Build successful"
    else
        error "Build failed - fix errors before pushing"
    fi
else
    warning "npm not found, skipping build test"
fi
echo ""

# Summary
echo "========================================"
echo "📊 SUMMARY"
echo "========================================"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All checks passed! Safe to push to public repository.${NC}"
    exit 0
elif [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Found $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo -e "${RED}⛔ DO NOT push to public repository until errors are fixed!${NC}"
    exit 1
else
    echo -e "${YELLOW}⚠️  Found $WARNINGS warning(s) but no errors${NC}"
    echo -e "${YELLOW}Review warnings before pushing to public repository${NC}"
    exit 0
fi
