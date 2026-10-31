@echo off
title Kalinga - Start All Services

echo Killing any existing processes on ports 5000, 8000, 8080, 4000...
npx kill-port 5000 8000 8080 4000 2>nul
timeout /t 1 /nobreak >nul

echo Starting Laravel backend (port 8000)...
start "Laravel" cmd /k "cd /d %~dp0backend && php artisan serve --host=127.0.0.1 --port=8000"

timeout /t 2 /nobreak >nul

echo Starting Laravel Reverb realtime server (port 8080)...
start "Reverb" cmd /k "cd /d %~dp0backend && php artisan reverb:start --port=8080"

timeout /t 2 /nobreak >nul

echo Starting Node backend (port 5000)...
start "Node API" cmd /k "cd /d %~dp0node-backend && node server.js"

timeout /t 2 /nobreak >nul

echo Starting Vite frontend (port 4000)...
start "Vite" cmd /k "cd /d %~dp0 && npm run dev"

echo.
echo All services started:
echo   Laravel  -^> http://127.0.0.1:8000
echo   Reverb   -^> ws://localhost:8080
echo   Node API -^> http://localhost:5000
echo   Vite     -^> http://localhost:4000
echo.
