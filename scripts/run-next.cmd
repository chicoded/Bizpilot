@echo off
cd /d "C:\Users\HP\Documents\trae_projects\implex"
set LOG=dev-server-runs.log
echo === START %date% %time% ===> %LOG%

REM Clean Next cache for first-run fresh compile
if exist ".next" (
  echo Cleaning .next cache... >> %LOG%
  rmdir /s /q ".next"
)

set NEXT_TELEMETRY_DISABLED=1
set PORT=3000
set HOSTNAME=127.0.0.1

echo Starting next dev via npx.cmd... >> %LOG%
REM Use node_modules\.bin\ next.cmd (shim exists per .verify-shims.txt)
call "node_modules\.bin\next.cmd" dev --hostname 127.0.0.1 --port 3000 2>>&1 >> %LOG%
set EXIT=%ERRORLEVEL%
echo === EXIT %EXIT% === >> %LOG%
