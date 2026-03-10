@echo off
setlocal enabledelayedexpansion
title GST Returns Downloader
color 0B

set "GST_HOME=%USERPROFILE%\GST_Engine"

echo.
echo  ============================================================
echo     GST Returns Downloader
echo  ============================================================
echo.

REM --- SMART CHECK: If already set up, skip to quick launch ---
if exist "%GST_HOME%\venv\Scripts\activate.bat" (
    if exist "%GST_HOME%\main.py" (
        if exist "%GST_HOME%\dist\index.html" (
            echo  Everything is already set up. Launching...
            echo.
            goto quick_launch
        )
    )
)

echo  First time setup detected. This will take 1-2 minutes.
echo.

REM --- Check Python ---
echo  Checking Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo.
    echo  Python is not installed. Attempting to install...
    echo.
    winget --version >nul 2>&1
    if !errorlevel!==0 (
        echo  Installing Python via winget... please wait...
        winget install Python.Python.3.12 --accept-package-agreements --accept-source-agreements
        set "PATH=%LOCALAPPDATA%\Programs\Python\Python312\;%LOCALAPPDATA%\Programs\Python\Python312\Scripts\;%PATH%"
    ) else (
        echo  Downloading Python installer...
        curl -sL "https://www.python.org/ftp/python/3.12.0/python-3.12.0-amd64.exe" -o "%TEMP%\python_setup.exe"
        if exist "%TEMP%\python_setup.exe" (
            echo  Running installer... Check "Add to PATH" if prompted.
            start /wait "" "%TEMP%\python_setup.exe" /passive InstallAllUsers=0 PrependPath=1
            del "%TEMP%\python_setup.exe" >nul 2>&1
            set "PATH=%LOCALAPPDATA%\Programs\Python\Python312\;%LOCALAPPDATA%\Programs\Python\Python312\Scripts\;%PATH%"
        )
    )
    python --version >nul 2>&1
    if errorlevel 1 (
        color 0C
        echo.
        echo  ERROR: Python could not be installed automatically.
        echo  Please install from https://python.org/downloads
        echo  Make sure to check "Add Python to PATH"
        echo.
        pause
        exit /b 1
    )
)
echo  Python is ready.
echo.

REM --- Kill old engine quietly ---
echo  Preparing environment...
taskkill /f /im pythonw.exe >nul 2>&1

REM --- Download code ---
echo  Downloading latest version...
mkdir "%GST_HOME%" 2>nul
cd /d "%GST_HOME%"

curl -sL "https://github.com/teamsleekcom-lgtm/GST-Returns-Downloader/archive/refs/heads/master.zip" -o repo.zip
if not exist repo.zip (
    color 0C
    echo  ERROR: Download failed. Check internet connection.
    echo.
    pause
    exit /b 1
)

echo  Extracting files...
powershell -Command "Expand-Archive -Path 'repo.zip' -DestinationPath '.' -Force"
if exist "GST-Returns-Downloader-master\engine" (
    xcopy /s /y /q "GST-Returns-Downloader-master\engine\*" "." >nul 2>&1
)
rmdir /s /q "GST-Returns-Downloader-master" 2>nul
del /q repo.zip 2>nul
echo  Files ready.
echo.

REM --- Setup Python venv ---
echo  Setting up Python environment...
if not exist "venv\Scripts\activate.bat" (
    echo  Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        color 0C
        echo  ERROR: Failed to create virtual environment.
        echo.
        pause
        exit /b 1
    )
)
call .\venv\Scripts\Activate.bat

echo  Installing dependencies...
pip install fastapi uvicorn selenium >nul 2>&1
echo  Dependencies ready.
echo.
goto start_server

REM ===== QUICK LAUNCH (repeat runs) =====
:quick_launch
cd /d "%GST_HOME%"
call .\venv\Scripts\Activate.bat

REM Check for updates
echo  Checking for updates...
curl -sL "https://raw.githubusercontent.com/teamsleekcom-lgtm/GST-Returns-Downloader/master/engine/main.py" -o main_check.py 2>nul
if exist main_check.py (
    fc /b main.py main_check.py >nul 2>&1
    if errorlevel 1 (
        echo  Update found! Downloading...
        curl -sL "https://github.com/teamsleekcom-lgtm/GST-Returns-Downloader/archive/refs/heads/master.zip" -o repo.zip 2>nul
        if exist repo.zip (
            powershell -Command "Expand-Archive -Path 'repo.zip' -DestinationPath '.' -Force"
            if exist "GST-Returns-Downloader-master\engine" (
                xcopy /s /y /q "GST-Returns-Downloader-master\engine\*" "." >nul 2>&1
            )
            rmdir /s /q "GST-Returns-Downloader-master" 2>nul
            del /q repo.zip 2>nul
            echo  Updated!
        )
    ) else (
        echo  Already on latest version.
    )
    del /q main_check.py 2>nul
)
echo.

REM ===== START SERVER =====
:start_server
echo  Starting server...

REM Kill anything on port 7842
taskkill /f /im pythonw.exe >nul 2>&1

REM Start uvicorn
start "GST_Engine" /min python -m uvicorn main:app --host 127.0.0.1 --port 7842

REM Wait for it
echo  Waiting for server...
set retries=0
:wait_loop
timeout /t 2 >nul
curl -s http://127.0.0.1:7842/status >nul 2>&1
if not errorlevel 1 goto server_ready
set /a retries+=1
echo  Attempt %retries%/10...
if %retries% GEQ 10 (
    color 0E
    echo.
    echo  Server is taking long. Try opening http://127.0.0.1:7842 manually.
    echo.
    pause
    exit /b 1
)
goto wait_loop

:server_ready
echo.
echo  Server is running!

REM Open browser
start "" "http://127.0.0.1:7842"

color 0A
echo.
echo  ============================================================
echo     GST Returns Downloader is running!
echo  ============================================================
echo.
echo  App is open at: http://127.0.0.1:7842
echo.
echo  YOUR DATA IS SAFE:
echo  - Closing the browser does NOT delete your data
echo  - Data persists until you clear it in Settings
echo.
echo  KEEP THIS WINDOW OPEN while using the app.
echo  Close this window to stop the engine.
echo  ============================================================
echo.
pause
