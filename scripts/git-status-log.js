const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT = path.join(PROJECT_ROOT, ".git-status.txt");

function run(args) {
  const res = spawnSync("git", args, { cwd: PROJECT_ROOT, encoding: "utf8", shell: false, timeout: 60000 });
  return {
    args,
    status: res.status,
    error: res.error ? res.error.message : null,
    stdout: (res.stdout || "").toString(),
    stderr: (res.stderr || "").toString(),
  };
}

const out = [];
out.push("--- git status --short ---");
out.push(JSON.stringify(run(["status", "--short"]), null, 2));
out.push("\n--- git log --oneline -8 ---");
out.push(JSON.stringify(run(["--no-pager", "log", "--oneline", "-8"]), null, 2));
out.push("\n--- git remote -v ---");
out.push(JSON.stringify(run(["remote", "-v"]), null, 2));
fs.writeFileSync(OUT, out.join("\n"));
process.exit(0);
