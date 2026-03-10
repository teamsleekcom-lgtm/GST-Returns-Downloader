@echo off
title GST Returns Downloader
color 0B
echo.
echo  ============================================================
echo     GST Returns Downloader - One Click Setup
echo  ============================================================
echo.
echo  This will set up everything you need automatically.
echo  Please keep this window open until setup is complete.
echo.

REM ---------------------------------------------------------------
REM  Step 0: Check prerequisites
REM ---------------------------------------------------------------
echo  [CHECK] Verifying Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: Python is not installed or not on PATH.
    echo.
    echo  Please install Python from https://python.org
    echo  IMPORTANT: Check "Add Python to PATH" during installation.
    echo.
    echo  After installing Python, run this file again.
    echo.
    pause
    exit /b 1
)
echo  [OK] Python found.

echo  [CHECK] Verifying curl...
curl --version >nul 2>&1
if errorlevel 1 (
    color 0C
    echo.
    echo  ERROR: curl is not available on this system.
    echo  Please update Windows or install curl manually.
    echo.
    pause
    exit /b 1
)
echo  [OK] curl found.
echo.

REM ---------------------------------------------------------------
REM  Step 1: Kill any old engine
REM ---------------------------------------------------------------
echo  [1/5] Closing any existing engine...
taskkill /f /im pythonw.exe >nul 2>&1
for /f "tokens=2" %%a in ('netstat -aon ^| findstr :7842 ^| findstr LISTENING 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  [OK] Port 7842 is clear.
echo.

REM ---------------------------------------------------------------
REM  Step 2: Create working directory and download
REM ---------------------------------------------------------------
set "GST_HOME=%USERPROFILE%\GST_Engine"
echo  [2/5] Setting up in %GST_HOME%...
mkdir "%GST_HOME%" 2>nul
cd /d "%GST_HOME%"

REM Download the repo as a zip
echo        Downloading latest version from GitHub...
curl -sL "https://github.com/teamsleekcom-lgtm/GST-Returns-Downloader/archive/refs/heads/master.zip" -o repo.zip
if not exist repo.zip (
    color 0C
    echo  ERROR: Download failed. Check your internet connection.
    pause
    exit /b 1
)

REM Extract
echo        Extracting files...
powershell -Command "Expand-Archive -Path 'repo.zip' -DestinationPath '.' -Force" >nul 2>&1

REM Move files to correct location
if exist "GST-Returns-Downloader-master\engine\main.py" (
    xcopy /s /y /q "GST-Returns-Downloader-master\engine\*" "." >nul 2>&1
)
REM Cleanup
rmdir /s /q "GST-Returns-Downloader-master" 2>nul
del /q repo.zip 2>nul
echo  [OK] Files ready.
echo.

REM ---------------------------------------------------------------
REM  Step 3: Set up Python virtual environment
REM ---------------------------------------------------------------
echo  [3/5] Setting up Python environment...
if not exist "venv\Scripts\activate.bat" (
    echo        Creating virtual environment (first time only)...
    python -m venv venv
)
call .\venv\Scripts\Activate.bat
echo  [OK] Virtual environment activated.
echo.

REM ---------------------------------------------------------------
REM  Step 4: Install dependencies
REM ---------------------------------------------------------------
echo  [4/5] Installing dependencies...
pip install fastapi uvicorn selenium >nul 2>&1
echo  [OK] Dependencies installed.
echo.

REM ---------------------------------------------------------------
REM  Step 5: Start the engine and open browser
REM ---------------------------------------------------------------
echo  [5/5] Starting GST Returns Downloader...
echo.

REM Start the server in background
where pythonw >nul 2>&1
if %errorlevel%==0 (
    start "GST_Engine" /min pythonw -m uvicorn main:app --host 127.0.0.1 --port 7842
) else (
    start "GST_Engine" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842
)

REM Wait for server to be ready
echo  Waiting for server to start...
set /a retries=0
:wait_loop
timeout /t 1 >nul
curl -s http://127.0.0.1:7842/status >nul 2>&1
if %errorlevel%==0 goto server_ready
set /a retries+=1
if %retries% GEQ 15 (
    color 0E
    echo.
    echo  WARNING: Server took too long to start.
    echo  Try opening http://127.0.0.1:7842 manually in your browser.
    echo.
    pause
    exit /b 1
)
goto wait_loop

:server_ready
echo  [OK] Server is running!
echo.

REM Open in default browser
echo  Opening application in your browser...
start "" "http://127.0.0.1:7842"

color 0A
echo.
echo  ============================================================
echo     GST Returns Downloader is running!
echo  ============================================================
echo.
echo  The app is open in your browser at:
echo  http://127.0.0.1:7842
echo.
echo  DO NOT CLOSE THIS WINDOW while using the application.
echo  To stop the engine, close this window or press Ctrl+C.
echo.
echo  ============================================================
echo.

REM Keep running so user knows the engine is alive
:keep_alive
timeout /t 60 >nul
REM Check if engine is still running
curl -s http://127.0.0.1:7842/status >nul 2>&1
if errorlevel 1 (
    color 0C
    echo  Engine has stopped unexpectedly. Restarting...
    where pythonw >nul 2>&1
    if %errorlevel%==0 (
        start "GST_Engine" /min pythonw -m uvicorn main:app --host 127.0.0.1 --port 7842
    ) else (
        start "GST_Engine" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842
    )
    timeout /t 3 >nul
)
goto keep_alive
