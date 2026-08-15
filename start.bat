@echo off
title Quiet Space - AI Journal Launcher
echo 🍃 Launching Quiet Space - AI Journal...
echo ----------------------------------------

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ⚠️ Node.js is NOT installed on your system!
    echo Quiet Space requires Node.js to run locally. Attempting to assist with installation...
    echo ----------------------------------------
    echo 🌐 Downloading the official Node.js installer...
    
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'"
    
    if exist "%TEMP%\node-installer.msi" (
        echo 📦 Opening the Node.js installation wizard...
        echo Please follow the setup screens in the Installer window.
        msiexec /i "%TEMP%\node-installer.msi"
    ) else (
        echo ❌ Download failed. Please download Node.js manually from: https://nodejs.org
    )
    
    echo.
    echo Once you complete the installation, please restart your computer or command prompt, then run this file again!
    pause
    exit /b 1
)

:: Install dependencies if node_modules folder is missing
if not exist "node_modules" (
    echo 📦 First time setup: Installing local packages (this may take a minute)...
    call npm install
)

echo 🚀 Starting local web server...

:: Open Google Chrome or default browser to the local address after a short delay
start /b "" cmd /c "timeout /t 2 >nul && (start chrome http://localhost:5173 || start http://localhost:5173)"

:: Launch Vite dev server
call npm run dev
