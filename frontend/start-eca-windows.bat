@echo off
echo ========================================
echo Extended Cellular Analyzer - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if dependencies are installed
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

REM Check if backend is running
echo [INFO] Checking backend connection...
curl -s http://localhost:8080/actuator/health >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] Backend is not running on port 8080!
    echo Please start the Spring Boot backend first.
    echo.
    set /p CONTINUE="Continue anyway? (y/n): "
    if /i not "%CONTINUE%"=="y" exit /b 1
)

echo.
echo [INFO] Starting Extended Cellular Analyzer...
echo.

REM Start Tauri dev mode
call npm run tauri dev

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Failed to start application!
    pause
    exit /b 1
)
