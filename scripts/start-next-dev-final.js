const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const NEXT_CLI = path.join(ROOT, "node_modules", ".bin", "next.cmd");
const LOG_OUT = path.join(ROOT, ".dev-server.out.log");
const LOG_ERR = path.join(ROOT, ".dev-server.err.log");
const SWC_DIR = path.join(ROOT, ".next-swc-cache");

fs.mkdirSync(SWC_DIR, { recursive: true });

const HEADER = `[START v4-final] ${new Date().toISOString()}\nnext cli exists: ${fs.existsSync(NEXT_CLI)} path=${NEXT_CLI}\n`;
fs.writeFileSync(LOG_OUT, HEADER);
fs.writeFileSync(LOG_ERR, HEADER);

const fdOut = fs.openSync(LOG_OUT, "a");
const fdErr = fs.openSync(LOG_ERR, "a");
function logO(s) { try { fs.writeSync(fdOut, s); } catch(e){} }
function logE(s) { try { fs.writeSync(fdErr, s); } catch(e){} }

const env = {
  ...process.env,
  NEXT_DISABLE_SWC_NATIVE: "0",  // try native now since file lock was released
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PRIVATE_LOCAL_WEBPACK: "0",
  PORT: "3000",
  HOSTNAME: "127.0.0.1",
};

const proc = spawn(
  NEXT_CLI,
  ["dev", "--hostname", "127.0.0.1", "--port", "3000"],
  { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: false, env, shell: true }
);

proc.stdout.on("data", (b) => logO(String(b)));
proc.stderr.on("data", (b) => logE(String(b)));
proc.on("error", (e) => logE("[SPAWN ERR] " + e.message + "\n" + (e.stack || "")));
proc.on("exit", (c, s) => {
  const line = `\n[EXIT code=${c || "NULL"} sig=${s || "NONE"} ${new Date().toISOString()}]\n`;
  logO(line); logE(line);
  process.exit(typeof c === "number" ? c : 1);
});

setInterval(() => {}, 1000);
