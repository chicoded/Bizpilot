const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const LOG = path.resolve(__dirname, "..", ".next-dev-server.log");
fs.writeFileSync(LOG, `[start] ${new Date().toISOString()}\n`, { flag: "w" });

const fd = fs.openSync(LOG, "a");

function log(line) {
  const out = line;
  try { fs.writeSync(fd, out + "\n"); } catch {}
  process.stdout.write(out + "\n");
}

// Invoke next dev via node
const nextBin = path.resolve(__dirname, "..", "node_modules", ".bin", "next.cmd");
const args = ["dev", "--turbopack", "--port", "3000", "--hostname", "0.0.0.0"];

log(`[spawn] nextBin=${nextBin} exists=${fs.existsSync(nextBin)}`);

if (!fs.existsSync(nextBin)) {
  // Maybe the project isn't installed. Try to detect via package manager's global paths.
  log("[error] node_modules/.bin/next.cmd missing — run npm install first");
  log("[info] trying global via npm.cmd");
  process.exit(1);
}

const child = spawn(nextBin, args, {
  cwd: path.resolve(__dirname, ".."),
  stdio: ["ignore", "pipe", "pipe"],
  shell: false,
  windowsHide: false,
});

child.stdout.on("data", (buf) => {
  const str = String(buf);
  str.split("\n").filter(Boolean).forEach((line) => log("[stdout] " + line));
});
child.stderr.on("data", (buf) => {
  const str = String(buf);
  str.split("\n").filter(Boolean).forEach((line) => log("[stderr] " + line));
});
child.on("error", (err) => log("[child_error] " + err.message + " " + err.stack));
child.on("exit", (code, signal) => log(`[child_exit] code=${code} signal=${signal}`));

// Keep process alive
setInterval(() => {}, 1000);
