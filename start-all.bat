@echo off
echo Starting RAG Bot...
echo.
echo [1/2] Starting Backend (Port 3000)...
start "Backend" cmd /k "cd /d %~dp0 && npm start"
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting Frontend (Port 5173)...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ========================================
echo Services starting...
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5173
echo ========================================
echo.
echo Press any key to exit this window...
pause >nul
