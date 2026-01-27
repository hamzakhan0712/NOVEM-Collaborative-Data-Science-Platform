@echo off
echo.
echo ========================================
echo   NOVEM Quick Build Script
echo ========================================
echo.

cd /d "%~dp0.."

echo [1/4] Installing dependencies...
call npm install
if %errorlevel% neq 0 goto :error

echo.
echo [2/4] Generating icons...
call npm run generate-icons
if %errorlevel% neq 0 goto :error

echo.
echo [3/4] Building frontend...
call npm run build
if %errorlevel% neq 0 goto :error

echo.
echo [4/4] Building Tauri application...
call npm run tauri:build
if %errorlevel% neq 0 goto :error

echo.
echo ========================================
echo   Build Complete!
echo ========================================
echo.
echo Installers are in: src-tauri\target\release\bundle
echo.
pause
exit /b 0

:error
echo.
echo ========================================
echo   Build Failed!
echo ========================================
echo.
pause
exit /b 1