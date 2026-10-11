const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const LOG = path.join(ROOT, "full-build.log");

fs.writeFileSync(LOG, `[start] ${new Date().toISOString()}\n`);
const fd = fs.openSync(LOG, "a");
function w(s) { try { fs.writeSync(fd, s); } catch(e){} }

function runStep(name, args) {
  return new Promise((resolve) => {
    w(`\n=== RUNNING: ${name} ===\n`);
    const child = spawn(process.execPath, args, {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
      windowsHide: false,
      env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1", NEXT_DISABLE_OTEL_TELEMETRY: "1" },
    });
    child.stdout.on("data", (b) => w(String(b)));
    child.stderr.on("data", (b) => w(String(b)));
    child.on("error", (e) => w(`[spawn err] ${e.message}\n`));
    child.on("exit", (c, s) => {
      w(`\n[${name} exit] code=${c} sig=${s}\n`);
      resolve(c);
    });
  });
}

(async () => {
  const prismaBin = path.join(ROOT, "node_modules", "prisma", "build", "index.js");
  const nextBin = path.join(ROOT, "node_modules", "next", "dist", "bin", "next");

  const c1 = await runStep("prisma generate", [prismaBin, "generate"]);
  if (c1 !== 0) { w("[FATAL] prisma generate failed\n"); process.exit(c1); }

  const c2 = await runStep("next build", [nextBin, "build"]);
  w(`\n[FINAL] next build exit code=${c2}\n`);
  process.exit(c2);
})();
