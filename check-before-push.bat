@echo off
REM Security Check Script for Windows - Run before pushing to public repository
REM This script checks for common security issues

echo.
echo 🔍 Running security checks before push...
echo ========================================
echo.

set ERRORS=0
set WARNINGS=0

REM 1. Check for AWS credentials
echo 1️⃣  Checking for AWS credentials...
findstr /s /r /i "AKIA[0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z][0-9A-Z]" *.js *.jsx *.json 2>nul | findstr /v node_modules >nul
if %ERRORLEVEL% EQU 0 (
    echo ❌ ERROR: Found AWS access keys in code!
    set /a ERRORS+=1
) else (
    echo ✅ No AWS credentials found in code
)
echo.

REM 2. Check for .env files
echo 2️⃣  Checking for .env files...
if exist .env (
    echo ❌ ERROR: Found .env file that might be committed!
    set /a ERRORS+=1
) else (
    echo ✅ No .env file found ^(good^)
)
echo.

REM 3. Check aws-credentials.txt
echo 3️⃣  Checking aws-credentials.txt...
if exist aws-credentials.txt (
    findstr /c:"your_access_key_here" aws-credentials.txt >nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ aws-credentials.txt is using template values
    ) else (
        findstr /r "AKIA[0-9A-Z]" aws-credentials.txt >nul
        if %ERRORLEVEL% EQU 0 (
            echo ❌ ERROR: aws-credentials.txt contains real credentials!
            set /a ERRORS+=1
        ) else (
            echo ⚠️  WARNING: aws-credentials.txt exists - ensure it is in .gitignore
            set /a WARNINGS+=1
        )
    )
) else (
    echo ✅ aws-credentials.txt not found ^(good if using .env^)
)
echo.

REM 4. Check .gitignore
echo 4️⃣  Checking .gitignore...
if exist .gitignore (
    findstr /c:"aws-credentials.txt" .gitignore >nul
    if %ERRORLEVEL% EQU 0 (
        findstr /c:".env" .gitignore >nul
        if %ERRORLEVEL% EQU 0 (
            echo ✅ .gitignore includes sensitive files
        ) else (
            echo ⚠️  WARNING: .gitignore might be missing .env
            set /a WARNINGS+=1
        )
    ) else (
        echo ⚠️  WARNING: .gitignore might be missing sensitive files
        set /a WARNINGS+=1
    )
) else (
    echo ❌ ERROR: .gitignore file not found!
    set /a ERRORS+=1
)
echo.

REM 5. Check for TODO comments
echo 5️⃣  Checking for TODO/FIXME comments...
findstr /s /i /c:"TODO" /c:"FIXME" /c:"HACK" src\*.js src\*.jsx 2>nul | find /c ":" >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  WARNING: Found TODO/FIXME comments - consider addressing them
    set /a WARNINGS+=1
) else (
    echo ✅ No TODO/FIXME comments found
)
echo.

REM 6. Check for console.log
echo 6️⃣  Checking for console.log statements...
findstr /s /c:"console.log" src\*.js src\*.jsx 2>nul | find /c ":" >nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  WARNING: Found console.log statements - consider removing for production
    set /a WARNINGS+=1
) else (
    echo ✅ Console.log usage is minimal
)
echo.

REM 7. Test if npm is available
echo 7️⃣  Checking npm...
where npm >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ✅ npm found
    
    REM 8. Run npm audit
    echo 8️⃣  Running npm audit...
    npm audit --audit-level=high >nul 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo ✅ No high-severity vulnerabilities found
    ) else (
        echo ⚠️  WARNING: Found security vulnerabilities - run 'npm audit' for details
        set /a WARNINGS+=1
    )
) else (
    echo ⚠️  WARNING: npm not found, skipping npm checks
    set /a WARNINGS+=1
)
echo.

REM Summary
echo ========================================
echo 📊 SUMMARY
echo ========================================
if %ERRORS% EQU 0 (
    if %WARNINGS% EQU 0 (
        echo 🎉 All checks passed! Safe to push to public repository.
        exit /b 0
    ) else (
        echo ⚠️  Found %WARNINGS% warning^(s^) but no errors
        echo Review warnings before pushing to public repository
        exit /b 0
    )
) else (
    echo ❌ Found %ERRORS% error^(s^) and %WARNINGS% warning^(s^)
    echo ⛔ DO NOT push to public repository until errors are fixed!
    exit /b 1
)
