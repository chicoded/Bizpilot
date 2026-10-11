const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const LOG = path.join(ROOT, "next-build2.log");

fs.writeFileSync(LOG, `[start] ${new Date().toISOString()}\n`);
const fd = fs.openSync(LOG, "a");
function w(s) { try { fs.writeSync(fd, s); } catch(e){} }

const child = spawn(process.execPath, [
  path.join(ROOT, "node_modules", "next", "dist", "bin", "next"),
  "build",
], {
  cwd: ROOT,
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
  windowsHide: false,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: "1",
    NEXT_DISABLE_OTEL_TELEMETRY: "1",
  },
});

child.stdout.on("data", (b) => w(String(b)));
child.stderr.on("data", (b) => w(String(b)));
child.on("error", (e) => w(`[spawn err] ${e.message}\n${e.stack||""}\n`));
child.on("exit", (c, s) => {
  w(`\n[exit] code=${c} sig=${s} ${new Date().toISOString()}\n`);
  process.exit(typeof c === "number" ? c : 1);
});
