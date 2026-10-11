@echo off
SETLOCAL ENABLEDELAYEDEXPANSION
cd /d "C:\Users\HP\Documents\trae_projects\implex"
set LOGFILE=C:\Users\HP\Documents\trae_projects\implex\setup-and-run.log

echo ========================================================== > %LOGFILE%
echo START STEP 1-2: %date% %time% >> %LOGFILE%
echo. >> %LOGFILE%

REM STEP 1: Kill zombie node processes
echo [1/5] Killing zombie node/next processes... >> %LOGFILE%
taskkill /F /IM node.exe 2>> %LOGFILE%
taskkill /F /IM next.exe 2>> %LOGFILE%
REM small sleep
timeout /t 2 /nobreak >nul 2>&1
echo done. >> %LOGFILE%
echo. >> %LOGFILE%

REM STEP 2: Clean caches and state
echo [2/5] Cleaning .next cache, .next-swc-cache, swc native lock... >> %LOGFILE%
if exist ".next" rmdir /s /q ".next" 2>> %LOGFILE%
if exist ".next-swc-cache" rmdir /s /q ".next-swc-cache" 2>> %LOGFILE%
REM Also try to unlock SWC native by renaming it temporarily — it may be locked
if exist "node_modules\@next\swc-win32-x64-msvc" (
  echo found @next/swc-win32-x64-msvc, moving to unlock >> %LOGFILE%
  move /y "node_modules\@next\swc-win32-x64-msvc" "node_modules\@next\swc-win32-x64-msvc.bak" >> %LOGFILE% 2>&1
)
echo done. >> %LOGFILE%
echo. >> %LOGFILE%

REM STEP 3: Rebuild .bin shims (npm install --force)
echo [3/5] Running npm.cmd install --force (rebuilds .bin shims) >> %LOGFILE%
echo start: %date% %time% >> %LOGFILE%
"C:\Program Files\nodejs\npm.cmd" install --force >> %LOGFILE% 2>&1
set NPM_EXIT=%ERRORLEVEL%
echo exit=%NPM_EXIT% end: %date% %time% >> %LOGFILE%
echo. >> %LOGFILE%

REM Now try to restore the SWC dir if install recreated a new one (or use the backup copy)
if exist "node_modules\@next\swc-win32-x64-msvc.bak" (
  echo restoring SWC backup >> %LOGFILE%
  move /y "node_modules\@next\swc-win32-x64-msvc.bak" "node_modules\@next\swc-win32-x64-msvc" >> %LOGFILE% 2>&1
)
echo. >> %LOGFILE%

REM STEP 4: Verify .bin shims
echo [4/5] Verify shims: >> %LOGFILE%
if exist "node_modules\.bin\next.cmd" ( echo next.cmd EXISTS >> %LOGFILE% ) else ( echo next.cmd MISSING >> %LOGFILE% )
if exist "node_modules\next\dist\bin\next" ( echo next/dist/bin/next EXISTS >> %LOGFILE% ) else ( echo next/dist/bin/next MISSING >> %LOGFILE% )
echo. >> %LOGFILE%

REM STEP 5: Write a launcher for the next dev server (runs asynchronously, writes to its own log)
echo [5/5] Writing next-dev-launcher script and starting it >> %LOGFILE%

REM Write a JS-based launcher so we can set env vars and capture output properly
(
  echo const { spawn } = require('node:child_process'^);
  echo const fs = require('node:fs'^);
  echo const path = require('node:path'^);
  echo const PROJECT_ROOT = path.resolve(__dirname, '..'^);
  echo const NEXT_CLI = path.join(PROJECT_ROOT, 'node_modules', 'next', 'dist', 'bin', 'next'^);
  echo const LOG = path.join(PROJECT_ROOT, '.dev-server.out.log'^);
  echo const ERR = path.join(PROJECT_ROOT, '.dev-server.err.log'^);
  echo const SWC_DIR = path.join(PROJECT_ROOT, '.next-swc-cache'^);
  echo fs.mkdirSync(SWC_DIR, { recursive: true }^);
  echo fs.mkdirSync(path.join(PROJECT_ROOT, '.next'^), { recursive: true }^);
  echo const header = '[START v3 ' + new Date().toISOString() + '] cwd=' + PROJECT_ROOT + ' cli_exists=' + fs.existsSync(NEXT_CLI^);
  echo fs.writeFileSync(LOG, header + '\n'^);
  echo fs.writeFileSync(ERR, header + '\n'^);
  echo const stdoutFd = fs.openSync(LOG, 'a'^);
  echo const stderrFd = fs.openSync(ERR, 'a'^);
  echo function logOut(s^) { try { fs.writeSync(stdoutFd, s + '\n'^); } catch(e^) {} }
  echo function logErr(s^) { try { fs.writeSync(stderrFd, s + '\n'^); } catch(e^) {} }
  echo const env = { ...process.env, NEXT_DISABLE_SWC_NATIVE: '1', NEXT_TELEMETRY_DISABLED: '1', NEXT_PRIVATE_LOCAL_WEBPACK: '1' };
  echo const proc = spawn(process.execPath, [ NEXT_CLI, 'dev', '--hostname', '127.0.0.1', '--port', '3000' ], { cwd: PROJECT_ROOT, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: false, env }^);
  echo proc.stdout.on('data', (buf^) =^> logOut(String(buf^)^)^);
  echo proc.stderr.on('data', (buf^) =^> logErr(String(buf^)^)^);
  echo proc.on('error', (e^) =^> logErr('[SPAWN ERR] ' + e.message^)^);
  echo proc.on('exit', (c, s^) =^> { const l = '[EXIT code=' + c + ' sig=' + s + ' ' + new Date().toISOString() + ']'; logOut(l^); logErr(l^); process.exit(typeof c === 'number' ? c : 0^); }^);
  echo setInterval((^) =^> {}, 1000^);
) > scripts\__next_launcher_v3.js

echo Launcher written. Starting it >> %LOGFILE%
echo start next dev: %date% %time% >> %LOGFILE%

REM Launch asynchronously via start (so batch finishes, process keeps running)
start "" /B "C:\Program Files\nodejs\node.exe" scripts\__next_launcher_v3.js 2>> %LOGFILE%

echo launcher PID started (if no immediate errors above). Check .dev-server.out.log in 2 minutes. >> %LOGFILE%
echo FINISHED SETUP BATCH: %date% %time% >> %LOGFILE%
echo ========================================================== >> %LOGFILE%

ENDLOCAL
exit /b 0
