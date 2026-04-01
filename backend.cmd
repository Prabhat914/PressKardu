@echo off
setlocal

set "ROOT=%~dp0"
cd /d "%ROOT%backend"

echo Starting backend from %cd%
node server.js
set "EXIT_CODE=%ERRORLEVEL%"

if not "%EXIT_CODE%"=="0" (
  echo.
  echo Backend exited with code %EXIT_CODE%.
  echo Check logs:
  echo   %ROOT%backend-run.log
  echo   %ROOT%backend-run.err.log
  echo   %ROOT%backend\server.err.log
  pause
)
