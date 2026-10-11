@echo off
setlocal
cd /d "C:\Users\HP\Documents\trae_projects\implex"
set NEXT_TELEMETRY_DISABLED=1
set PORT=3000
set HOSTNAME=127.0.0.1
set NODE_OPTIONS=--no-experimental-require-module
set NEXT_PRIVATE_LOCAL_WEBPACK=1
set NEXT_DISABLE_SWC_NATIVE=0
set NEXT_SKIP_INSTRUMENTATION=1

start "ZaplexNextDev" /MIN "C:\Program Files\nodejs\node.exe" node_modules\.bin\next dev --hostname 127.0.0.1 --port 3000 > dev-stdout.log 2> dev-stderr.log
echo start launched
exit /b 0
