const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const NEXT_CMD = path.join(ROOT, "node_modules", ".bin", "next.cmd");
const PORT = 4000;
const HOST = "127.0.0.1";
const LOG_O = path.join(ROOT, ".dev-p4000.out.log");
const LOG_E = path.join(ROOT, ".dev-p4000.err.log");

fs.writeFileSync(LOG_O, `[v5 start] pid=${process.pid} PORT=${PORT} host=${HOST} nextExists=${fs.existsSync(NEXT_CMD)}\n`);
fs.writeFileSync(LOG_E, `[v5 start] pid=${process.pid} PORT=${PORT}\n`);

const fo = fs.openSync(LOG_O, "a");
const fe = fs.openSync(LOG_E, "a");

const env = {
  ...process.env,
  PORT: String(PORT),
  HOSTNAME: HOST,
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PRIVATE_LOCAL_WEBPACK: "1",
  NEXT_DISABLE_SWC_NATIVE: "1",
  NEXT_SKIP_INSTRUMENTATION: "1",
  NEXT_DISABLE_OTEL_TELEMETRY: "1",
};

const child = spawn(NEXT_CMD, ["dev", "--hostname", HOST, "--port", String(PORT)], {
  cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"], shell: true, windowsHide: false,
});

child.stdout.on("data", (b) => { try { fs.writeSync(fo, String(b)); } catch(e) {} });
child.stderr.on("data", (b) => { try { fs.writeSync(fe, String(b)); } catch(e) {} });
child.on("error", (e) => { try { fs.writeSync(fe, `[spawn err] ${e.message}\n`); } catch{} });
child.on("exit", (c, s) => {
  const line = `[exit] code=${c || "NULL"} sig=${s || "NULL"} ${new Date().toISOString()}\n`;
  try { fs.writeSync(fo, line); fs.writeSync(fe, line); } catch{}
  process.exit(typeof c === "number" ? c : 1);
});
setInterval(() => {}, 999999);
