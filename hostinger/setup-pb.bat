@echo off
REM ============================================
REM Mista King Kitchen — PocketBase Setup (Windows)
REM ============================================

set PB_DIR=%~dp0
set PB_VERSION=0.22.13

echo ============================================
echo   MKK — PocketBase Setup (Windows)
echo ============================================
echo.

echo [INFO] Downloading PocketBase v%PB_VERSION%...

set PB_URL=https://github.com/pocketbase/pocketbase/releases/download/v%PB_VERSION%/pocketbase_%PB_VERSION%_windows_amd64.zip
set PB_ZIP=%PB_DIR%pocketbase.zip

powershell -Command "Invoke-WebRequest -Uri '%PB_URL%' -OutFile '%PB_ZIP%' -UseBasicParsing"

echo [INFO] Extracting...
powershell -Command "Expand-Archive -Path '%PB_ZIP%' -DestinationPath '%PB_DIR%' -Force"
del "%PB_ZIP%"

echo [OK] PocketBase binary ready

REM Create admin user
echo [INFO] PocketBase will start on first run.
echo [INFO] To create admin, run these commands:
echo.
echo   cd %PB_DIR%
echo   pocketbase.exe serve --http 127.0.0.1:8090
echo.
echo Then in another terminal:
echo   curl -X POST http://127.0.0.1:8090/api/admins -H "Content-Type: application/json" -d "{\"email\":\"info@nenifix.com\",\"password\":\"nenifix2mkk\",\"passwordConfirm\":\"nenifix2mkk\"}"
echo.
echo Admin Login:
echo   Email:    info@nenifix.com
echo   Password: nenifix2mkk

pause
