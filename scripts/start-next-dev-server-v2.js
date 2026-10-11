const { spawn } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const NEXT_CLI = path.join(PROJECT_ROOT, "node_modules", "next", "dist", "bin", "next");
const LOG = path.join(PROJECT_ROOT, ".dev-server.out.log");
const ERR = path.join(PROJECT_ROOT, ".dev-server.err.log");
const SWC_DIR = path.join(PROJECT_ROOT, ".next-swc-cache");
const NEXT_CACHE = path.join(PROJECT_ROOT, ".next");

fs.mkdirSync(SWC_DIR, { recursive: true });
fs.mkdirSync(NEXT_CACHE, { recursive: true });

const header = [
  `[START v2 ${new Date().toISOString()}]`,
  `  cwd=${PROJECT_ROOT}`,
  `  next CLI exists=${fs.existsSync(NEXT_CLI)} path=${NEXT_CLI}`,
  `  SWC dir=${SWC_DIR} writable=${isWritable(SWC_DIR)}`,
  `  NEXT cache=${NEXT_CACHE} writable=${isWritable(NEXT_CACHE)}`,
  "",
].join("\n");
fs.writeFileSync(LOG, header);
fs.writeFileSync(ERR, header);

function isWritable(p) {
  try {
    const test = path.join(p, "._test_" + process.pid);
    fs.writeFileSync(test, "t");
    fs.unlinkSync(test);
    return true;
  } catch {
    return false;
  }
}

const stdoutFd = fs.openSync(LOG, "a");
const stderrFd = fs.openSync(ERR, "a");
function logOut(s) { try { fs.writeSync(stdoutFd, s + "\n"); } catch {} }
function logErr(s) { try { fs.writeSync(stderrFd, s + "\n"); } catch {} }

logOut("[env] NEXT_SWC_WASM_DOWNLOAD_DIR=" + SWC_DIR);
logOut("[env] NEXT_DISABLE_SWC_NATIVE=1");

const env = {
  ...process.env,
  NEXT_SWC_WASM_DOWNLOAD_DIR: SWC_DIR,
  NEXT_DISABLE_SWC_NATIVE: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PRIVATE_LOCAL_WEBPACK: "1",
};

const args = [
  NEXT_CLI,
  "dev",
  "--hostname", "127.0.0.1",
  "--port", "3000",
];

const proc = spawn(process.execPath, args, {
  cwd: PROJECT_ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: false,
  env,
});

proc.stdout.on("data", (buf) => logOut(String(buf)));
proc.stderr.on("data", (buf) => logErr(String(buf)));
proc.on("error", (e) => logErr("[SPAWN ERROR] " + e.message + "\n" + (e.stack || "")));
proc.on("exit", (code, signal) => {
  const line = `[EXIT ${code == null ? "NULL" : code} sig=${signal || "NONE"} ${new Date().toISOString()}]`;
  logOut(line);
  logErr(line);
  process.exit(typeof code === "number" ? code : 0);
});

setInterval(() => {}, 1000);
