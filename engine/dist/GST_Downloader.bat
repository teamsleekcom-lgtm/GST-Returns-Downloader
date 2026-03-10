@echo off
title GST Returns Downloader
color 0B

set "GST_HOME=%USERPROFILE%\GST_Engine"

echo.
echo  ============================================================
echo     GST Returns Downloader
echo  ============================================================
echo.

REM ---------------------------------------------------------------
REM  SMART CHECK: If already set up, skip straight to launch
REM ---------------------------------------------------------------
if exist "%GST_HOME%\venv\Scripts\activate.bat" (
    if exist "%GST_HOME%\main.py" (
        if exist "%GST_HOME%\dist\index.html" (
            echo  [FAST START] Everything is already set up!
            echo.
            goto quick_launch
        )
    )
)

echo  First time setup detected. This will take 1-2 minutes.
echo.

REM ---------------------------------------------------------------
REM  Step 0: Check / Install Python
REM ---------------------------------------------------------------
echo  [CHECK] Verifying Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo  [!] Python not found. Attempting automatic installation...
    echo.
    
    REM Try winget first (Windows 10 1709+ and Windows 11)
    winget --version >nul 2>&1
    if %errorlevel%==0 (
        echo  Installing Python via Windows Package Manager...
        echo  This may take a few minutes. Please wait.
        echo.
        winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements >nul 2>&1
        
        REM Refresh PATH after install
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python312\;%LOCALAPPDATA%\Programs\Python\Python312\Scripts\;%PATH%"
        
        python --version >nul 2>&1
        if errorlevel 1 (
            goto python_manual
        )
        echo  [OK] Python installed successfully!
        echo.
    ) else (
        REM Try downloading installer directly
        echo  Downloading Python installer...
        curl -sL "https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe" -o "%TEMP%\python_installer.exe"
        if exist "%TEMP%\python_installer.exe" (
            echo  Running Python installer (this will open a window)...
            echo  IMPORTANT: Make sure "Add Python to PATH" is checked!
            echo.
            start /wait "" "%TEMP%\python_installer.exe" /passive InstallAllUsers=0 PrependPath=1 Include_test=0
            del "%TEMP%\python_installer.exe" >nul 2>&1
            
            REM Refresh PATH
            set "PATH=%LOCALAPPDATA%\Programs\Python\Python312\;%LOCALAPPDATA%\Programs\Python\Python312\Scripts\;%PATH%"
            
            python --version >nul 2>&1
            if errorlevel 1 (
                goto python_manual
            )
            echo  [OK] Python installed!
            echo.
        ) else (
            goto python_manual
        )
    )
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo  [OK] %%v found.
echo.
goto python_ok

:python_manual
color 0C
echo.
echo  ============================================================
echo  Could not install Python automatically.
echo.
echo  Please install Python manually:
echo    1. Go to https://python.org/downloads
echo    2. Download Python 3.12 or later
echo    3. IMPORTANT: Check "Add Python to PATH" during install
echo    4. Run this file again after installing
echo  ============================================================
echo.
pause
exit /b 1

:python_ok

REM ---------------------------------------------------------------
REM  Step 1: Kill any old engine
REM ---------------------------------------------------------------
echo  [1/4] Preparing environment...
taskkill /f /im pythonw.exe >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7842" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  [OK] Port 7842 is clear.
echo.

REM ---------------------------------------------------------------
REM  Step 2: Download latest code
REM ---------------------------------------------------------------
echo  [2/4] Downloading latest version...
mkdir "%GST_HOME%" 2>nul
cd /d "%GST_HOME%"

curl -sL "https://github.com/teamsleekcom-lgtm/GST-Returns-Downloader/archive/refs/heads/master.zip" -o repo.zip
if not exist repo.zip (
    color 0C
    echo  ERROR: Download failed. Check your internet connection.
    pause
    exit /b 1
)

powershell -Command "Expand-Archive -Path 'repo.zip' -DestinationPath '.' -Force" >nul 2>&1
if exist "GST-Returns-Downloader-master\engine" (
    xcopy /s /y /q "GST-Returns-Downloader-master\engine\*" "." >nul 2>&1
)
rmdir /s /q "GST-Returns-Downloader-master" 2>nul
del /q repo.zip 2>nul
echo  [OK] Latest version downloaded.
echo.

REM ---------------------------------------------------------------
REM  Step 3: Set up Python environment (skip if exists)
REM ---------------------------------------------------------------
echo  [3/4] Setting up Python environment...
if not exist "venv\Scripts\activate.bat" (
    echo        Creating virtual environment (first time only, ~30s)...
    python -m venv venv
)
call .\venv\Scripts\Activate.bat

REM Install/update dependencies
pip install fastapi uvicorn selenium >nul 2>&1
echo  [OK] Dependencies ready.
echo.

REM ---------------------------------------------------------------
REM  Step 4: Launch
REM ---------------------------------------------------------------
echo  [4/4] Starting application...
echo.
goto start_server

REM ---------------------------------------------------------------
REM  QUICK LAUNCH (for repeat runs - skips download and setup)
REM ---------------------------------------------------------------
:quick_launch
cd /d "%GST_HOME%"

REM Kill any existing engine first
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":7842" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /f /pid %%a >nul 2>&1
)

REM Check if engine is already running
curl -s http://127.0.0.1:7842/status >nul 2>&1
if %errorlevel%==0 (
    echo  Engine is already running. Opening browser...
    start "" "http://127.0.0.1:7842"
    goto running_message
)

call .\venv\Scripts\Activate.bat

REM Check for updates silently in background (non-blocking)
echo  Checking for updates...
curl -sL "https://raw.githubusercontent.com/teamsleekcom-lgtm/GST-Returns-Downloader/master/engine/main.py" -o main_new.py 2>nul
if exist main_new.py (
    fc /b main.py main_new.py >nul 2>&1
    if errorlevel 1 (
        echo  [UPDATE] New version found! Downloading...
        curl -sL "https://github.com/teamsleekcom-lgtm/GST-Returns-Downloader/archive/refs/heads/master.zip" -o repo.zip 2>nul
        if exist repo.zip (
            powershell -Command "Expand-Archive -Path 'repo.zip' -DestinationPath '.' -Force" >nul 2>&1
            if exist "GST-Returns-Downloader-master\engine" (
                xcopy /s /y /q "GST-Returns-Downloader-master\engine\*" "." >nul 2>&1
            )
            rmdir /s /q "GST-Returns-Downloader-master" 2>nul
            del /q repo.zip 2>nul
            echo  [OK] Updated to latest version!
        )
    ) else (
        echo  [OK] Already on latest version.
    )
    del /q main_new.py 2>nul
)
echo.

:start_server
REM Start the server
where pythonw >nul 2>&1
if %errorlevel%==0 (
    start "GST_Engine" /min pythonw -m uvicorn main:app --host 127.0.0.1 --port 7842
) else (
    start "GST_Engine" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842
)

REM Wait for server to be ready
echo  Starting server...
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
    echo  Try opening http://127.0.0.1:7842 manually.
    pause
    exit /b 1
)
goto wait_loop

:server_ready
echo  [OK] Server is running!
echo.

REM Open browser
start "" "http://127.0.0.1:7842"

:running_message
color 0A
echo.
echo  ============================================================
echo     GST Returns Downloader is running!
echo  ============================================================
echo.
echo  App is open at: http://127.0.0.1:7842
echo.
echo  YOUR DATA IS SAFE:
echo  - All client data is saved in your browser (localStorage)
echo  - Closing the browser tab does NOT delete your data
echo  - Data persists until you clear it from Settings
echo  - You can close and reopen the browser anytime
echo.
echo  KEEP THIS WINDOW OPEN while using the app.
echo  Press Ctrl+C or close this window to stop the engine.
echo.
echo  ============================================================
echo.

REM Health monitor with auto-restart
:keep_alive
timeout /t 30 >nul
curl -s http://127.0.0.1:7842/status >nul 2>&1
if errorlevel 1 (
    echo  [!] Engine stopped. Restarting...
    cd /d "%GST_HOME%"
    call .\venv\Scripts\Activate.bat
    where pythonw >nul 2>&1
    if %errorlevel%==0 (
        start "GST_Engine" /min pythonw -m uvicorn main:app --host 127.0.0.1 --port 7842
    ) else (
        start "GST_Engine" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842
    )
    timeout /t 3 >nul
    echo  [OK] Engine restarted.
)
goto keep_alive
