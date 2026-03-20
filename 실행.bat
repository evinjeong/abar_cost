@echo off
setlocal
cd /d %~dp0

title Abar Cost Dashboard

echo ==========================================
echo   Abar Cost Dashboard 실행 중...
echo ==========================================

:: 브라우저 자동 시작 (서버 시작 후 3초 뒤)
echo 3초 후 브라우저가 열립니다: http://localhost:6500
start "" "http://localhost:6500"

:: Vite 개발 서버 시작
echo 서버를 시작합니다...
npm run dev

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] 서버 실행 중 오류가 발생했습니다.
    echo npm install을 먼저 실행해 보세요.
    pause
)
