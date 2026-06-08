@echo off
echo ===================================================
echo   Maintenance Wizard - Starting Backend Server
echo   Tata Steel AI Hackathon 2026
echo ===================================================
echo.

cd /d "%~dp0backend"

REM Check if .env exists
if not exist ".env" (
    echo Creating .env from template...
    copy ".env.example" ".env"
    echo.
    echo IMPORTANT: Edit backend\.env and add your OPENAI_API_KEY
    echo The system will work without it using fallback responses.
    echo.
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating Python virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt --quiet

echo.
echo Starting Maintenance Wizard API server...
echo API: http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.
python run.py

pause
