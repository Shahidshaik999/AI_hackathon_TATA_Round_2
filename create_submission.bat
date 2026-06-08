@echo off
echo ===================================================
echo   Creating Submission ZIP for Tata Steel Hackathon
echo ===================================================
echo.

set ZIP_NAME=Maintenance_Wizard_TataSteel_Round2.zip
set EXCLUDE_FILE=exclude_list.txt

REM Create exclude list
echo backend\venv\ > %EXCLUDE_FILE%
echo backend\__pycache__\ >> %EXCLUDE_FILE%
echo backend\*.db >> %EXCLUDE_FILE%
echo backend\chroma_db\ >> %EXCLUDE_FILE%
echo frontend\node_modules\ >> %EXCLUDE_FILE%
echo frontend\dist\ >> %EXCLUDE_FILE%
echo **\__pycache__\ >> %EXCLUDE_FILE%
echo **\*.pyc >> %EXCLUDE_FILE%
echo .git\ >> %EXCLUDE_FILE%

REM Remove old zip if exists
if exist %ZIP_NAME% del %ZIP_NAME%

REM Create zip using PowerShell
powershell -Command "Compress-Archive -Path '.\backend', '.\frontend\src', '.\frontend\package.json', '.\frontend\vite.config.ts', '.\frontend\tailwind.config.js', '.\frontend\tsconfig.json', '.\frontend\index.html', '.\data', '.\docs', '.\README.md', '.\start_backend.bat', '.\start_frontend.bat', '.\backend\.env.example' -DestinationPath '%ZIP_NAME%' -Force"

del %EXCLUDE_FILE%

echo.
echo Submission ZIP created: %ZIP_NAME%
echo.
echo IMPORTANT: The .env file with your API key is NOT included.
echo The zip contains .env.example instead.
echo.
pause
