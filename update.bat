@echo off
setlocal
TITLE MobinexCorpAdmin - Publish Update
cd /d "%~dp0"
cls

echo ==================================================
echo   MobinexCorpAdmin - Publish Application Update
echo ==================================================
echo.
echo This publishes a new installer to GitHub Releases.
echo Installed copies of the app will detect the new version.
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo ERROR: Node.js is not installed or not in PATH.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing dependencies for the first time...
  call npm install
  if errorlevel 1 goto :fail
)

call npm run publish:update
if errorlevel 1 goto :fail

echo.
pause
exit /b 0

:fail
echo.
echo Update publishing failed. Read the error above.
pause
exit /b 1
