@echo off
cd /d "%~dp0"
echo ================================================
echo HR Robots - Interactive Test Dashboard
echo ================================================
echo.
echo Installing dependencies...
pip install flask flask-cors -q
echo.
echo Starting dashboard server...
echo Open http://localhost:5000 in your browser
echo.
python test_dashboard.py
pause
