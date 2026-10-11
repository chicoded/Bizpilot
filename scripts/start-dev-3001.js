const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const PORT = 3001;
const HOST = "127.0.0.1";
const LOG_O = path.join(ROOT, ".dev.3001.out.log");
const LOG_E = path.join(ROOT, ".dev.3001.err.log");

const NEXT_DIST_BIN_NEXT = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

fs.writeFileSync(LOG_O, `[start v6] ${new Date().toISOString()}\npid=${process.pid}\nport=${PORT}\nhost=${HOST}\nnext=${NEXT_DIST_BIN_NEXT} exists=${fs.existsSync(NEXT_DIST_BIN_NEXT)}\n`);
fs.writeFileSync(LOG_E, `[start v6] ${new Date().toISOString()}\n`);
const fdO = fs.openSync(LOG_O, "a");
const fdE = fs.openSync(LOG_E, "a");
function wO(s){ try { fs.writeSync(fdO, s); } catch(e){} }
function wE(s){ try { fs.writeSync(fdE, s); } catch(e){} }

// Don't use shell:true — call Node directly with the CLI JS file path as arg 1
const child = spawn(process.execPath, [
  NEXT_DIST_BIN_NEXT,
  "dev",
  "--hostname", HOST,
  "--port", String(PORT),
  // Turbopack sometimes works around SWC issues in Next 15
  "--turbopack",
], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,  // KEY FIX — no shell arg escaping, direct node invocation
  windowsHide: false,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_PRIVATE_LOCAL_WEBPACK: "0",
    NEXT_DISABLE_SWC_NATIVE: "0",
    NEXT_SKIP_INSTRUMENTATION: "1",
    NEXT_DISABLE_OTEL_TELEMETRY: "1",
    TURBOPACK_BINDING_IGNORE_VERSION: "1",
  },
});

child.stdout.on("data", (b) => wO(String(b)));
child.stderr.on("data", (b) => wE(String(b)));
child.on("error", (e) => wE(`[spawn err] ${e.message}\n${e.stack || ""}\n`));
child.on("exit", (c, s) => {
  const line = `\n[exit] code=${c || "NULL"} sig=${s || "NULL"} ${new Date().toISOString()}\n`;
  wO(line); wE(line);
  process.exit(typeof c === "number" ? c : 1);
});
setInterval(() => {}, 999999);
