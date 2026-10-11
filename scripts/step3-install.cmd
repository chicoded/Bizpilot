@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
cd /d "C:\Users\HP\Documents\trae_projects\implex"
set LOG=C:\Users\HP\Documents\trae_projects\implex\step3-install.log
echo ============== STEP 3: npm install + prisma generate START %date% %time% ============== > %LOG%

echo Kill remaining node zombies... >> %LOG%
taskkill /F /IM node.exe 2>> %LOG%
timeout /t 2 /nobreak >nul 2>&1

echo Running "C:\Program Files\nodejs\npm.cmd" install --force >> %LOG%
echo start: %date% %time% >> %LOG%
"C:\Program Files\nodejs\npm.cmd" install --force >> %LOG% 2>&1
set EXIT=%ERRORLEVEL%
echo npm exit code=%EXIT%  end: %date% %time% >> %LOG%

echo. >> %LOG%
echo Verify .bin shims and @prisma/client generated: >> %LOG%
if exist "node_modules\.bin\next.cmd" echo     next.cmd EXIST >> %LOG% else echo     next.cmd MISSING >> %LOG%
if exist "node_modules\.bin\prisma.cmd" echo     prisma.cmd EXIST >> %LOG% else echo     prisma.cmd MISSING >> %LOG%
if exist "node_modules\.prisma" echo     .prisma EXIST (client generated) >> %LOG% else echo     .prisma MISSING >> %LOG%
if exist "node_modules\@prisma\client\index.js" echo     @prisma/client/index.js EXIST >> %LOG% else echo     MISSING >> %LOG%

echo ============== DONE ============== >> %LOG%
ENDLOCAL
exit /b 0
