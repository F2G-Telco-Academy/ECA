@echo off
title Extended Cellular Analyzer - Startup
color 0A

echo ========================================
echo  Extended Cellular Analyzer
echo  Version 0.1.0
echo ========================================
echo.

REM Check Java
echo [1/4] Checking Java installation...
java -version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Java not found. Please install JDK 21+
    pause
    exit /b 1
)
echo [OK] Java found

REM Check Node.js
echo [2/4] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)
echo [OK] Node.js found

REM Start Backend
echo [3/4] Starting backend server...
cd /d "%~dp0"
start "ECA Backend" /MIN java -jar target\p2-0.0.1-SNAPSHOT.jar
echo [OK] Backend starting on http://localhost:8080

REM Wait for backend to initialize
echo [4/4] Waiting for backend to initialize...
timeout /t 10 /nobreak >nul

REM Check backend health
curl -s http://localhost:8080/actuator/health >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Backend may not be ready yet. Continuing anyway...
) else (
    echo [OK] Backend is healthy
)

REM Start Frontend (if Tauri build exists)
if exist "frontend\src-tauri\target\release\extended-cellular-analyzer.exe" (
    echo.
    echo Starting desktop application...
    start "" "frontend\src-tauri\target\release\extended-cellular-analyzer.exe"
) else (
    echo.
    echo [INFO] Desktop app not found. Opening browser instead...
    start http://localhost:3000
    cd frontend
    npm run dev
)

echo.
echo ========================================
echo  Application Started Successfully!
echo ========================================
echo.
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:3000
echo.
echo Press any key to stop all services...
pause >nul

REM Cleanup
taskkill /FI "WINDOWTITLE eq ECA Backend*" /F >nul 2>&1
echo.
echo Services stopped. Goodbye!
timeout /t 2 >nul
