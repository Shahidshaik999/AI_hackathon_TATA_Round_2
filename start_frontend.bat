@echo off
echo ===================================================
echo   Maintenance Wizard - Starting Frontend
echo   Tata Steel AI Hackathon 2026
echo ===================================================
echo.

cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

echo Starting frontend development server...
echo URL: http://localhost:5173
echo.
npm run dev

pause
