@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Arcana Forge requires Node.js 18 or newer.
  echo Install it from https://nodejs.org/ then try again.
  pause
  exit /b 1
)
start "" cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"
echo Arcana Forge is starting at http://localhost:3000
echo Keep this window open while hosting a game.
node server.js
if errorlevel 1 pause
