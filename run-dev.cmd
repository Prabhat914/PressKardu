@echo off
setlocal

set "ROOT=%~dp0"
set "BACKEND_LOG=%ROOT%backend-run.log"
set "BACKEND_ERR=%ROOT%backend-run.err.log"

echo Starting PressKardu dev stack...
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:5000
echo.

if exist "%BACKEND_LOG%" del "%BACKEND_LOG%"
if exist "%BACKEND_ERR%" del "%BACKEND_ERR%"

start "PressKardu Backend" cmd /k ""%ROOT%backend.cmd" 1>>"%BACKEND_LOG%" 2>>"%BACKEND_ERR%""

timeout /t 2 /nobreak >nul

cd /d "%ROOT%frontend"
npm.cmd run dev -- --host 0.0.0.0
