@echo off
echo.
echo ==========================================
echo  Killing processes on ports 3000 and 5000
echo ==========================================
echo.

echo Checking port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 5000...
    taskkill /F /PID %%a 2>nul
)

echo.
echo Checking port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3000...
    taskkill /F /PID %%a 2>nul
)

echo.
echo ==========================================
echo  Ports cleared!
echo ==========================================
echo.
echo You can now run: npm run dev
echo.
pause
