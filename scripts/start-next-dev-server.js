const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const NEXT_CLI = path.join(PROJECT_ROOT, "node_modules", "next", "dist", "bin", "next");
const LOG = path.join(PROJECT_ROOT, ".dev-server.out.log");
const ERR = path.join(PROJECT_ROOT, ".dev-server.err.log");

const exists = fs.existsSync(NEXT_CLI);
const header = [
  `[START ${new Date().toISOString()}]`,
  `  cwd=${PROJECT_ROOT}`,
  `  next CLI exists=${exists} path=${NEXT_CLI}`,
  "",
].join("\n");
fs.writeFileSync(LOG, header);
fs.writeFileSync(ERR, header);

const stdoutFd = fs.openSync(LOG, "a");
const stderrFd = fs.openSync(ERR, "a");

function logOut(msg) {
  try { fs.writeSync(stdoutFd, msg + "\n"); } catch {}
}
function logErr(msg) {
  try { fs.writeSync(stderrFd, msg + "\n"); } catch {}
}

if (!exists) {
  logErr("[FATAL] next CLI not found at expected path");
  process.exit(1);
}

// Node 24 can execute the JS script shebang line. We need to invoke it via Node.
const proc = spawn(
  process.execPath, // C:\Program Files\nodejs\node.exe
  [
    NEXT_CLI,
    "dev",
    "--turbopack",
    "--hostname", "127.0.0.1",
    "--port", "3000",
  ],
  {
    cwd: PROJECT_ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: false,
    env: process.env,
  }
);

proc.stdout.on("data", (buf) => {
  const s = String(buf);
  logOut(s);
});
proc.stderr.on("data", (buf) => {
  const s = String(buf);
  logErr(s);
});
proc.on("error", (e) => logErr("[SPAWN ERROR] " + e.message + "\n" + e.stack));
proc.on("exit", (code, signal) => {
  logOut(`[EXIT ${code || "NULL"} sig=${signal || "NONE"} ${new Date().toISOString()}]`);
  logErr(`[EXIT ${code || "NULL"} sig=${signal || "NONE"} ${new Date().toISOString()}]`);
  process.exit(code || 0);
});

setInterval(() => {}, 1000);
