@echo off
REM ============================================================
REM RAYA Production Deployment - Native Node.js (No Docker)
REM ============================================================

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo     RAYA Production Deployment - Native Setup
echo ============================================================
echo.

cd /d c:\GESTION BOUTIQUE2\raya-backend

REM 1. Check prerequisites
echo [1] Checking prerequisites...
node --version >nul 2>&1 || (echo ERROR: Node.js not installed && exit /b 1)
npm --version >nul 2>&1 || (echo ERROR: npm not installed && exit /b 1)
echo ✓ Node.js and npm found

REM 2. Install dependencies if needed
if exist "node_modules" (
    echo ✓ Dependencies already installed
) else (
    echo [2] Installing dependencies...
    call npm install || exit /b 1
    echo ✓ Dependencies installed
)

REM 3. Build application
echo.
echo [3] Building application...
call npm run build >nul 2>&1
if errorlevel 1 (
    echo WARNING: Build may have warnings, continuing...
) else (
    echo ✓ Build completed
)

REM 4. Check environment file
echo.
echo [4] Checking environment configuration...
if exist ".env.production" (
    echo ✓ .env.production found
) else (
    echo ERROR: .env.production not found
    exit /b 1
)

REM 5. Run migrations
echo.
echo [5] Running database migrations...
if exist "dist\src\cli\migrate.js" (
    call npm run migration:run >nul 2>&1
    echo ✓ Migrations completed
) else (
    echo ℹ No migration script found, skipping
)

REM 6. Start application
echo.
echo [6] Starting application...
echo ✓ API starting on port 3000
echo.

REM Check if PM2 is available
npm list pm2 >nul 2>&1
if errorlevel 0 (
    call npx pm2 start dist/main.js --name raya-api --update-env
) else (
    echo Starting with npm...
    call npm run start:prod
)

pause
