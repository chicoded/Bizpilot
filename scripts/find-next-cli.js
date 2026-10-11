const fs = require("node:fs");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const NEXT_ROOT = path.join(PROJECT_ROOT, "node_modules", "next");
const OUT = path.join(PROJECT_ROOT, ".next-cli-check.txt");
const lines = [];
lines.push("NEXT_ROOT=" + NEXT_ROOT + " exists=" + fs.existsSync(NEXT_ROOT));
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(NEXT_ROOT, "package.json"), "utf8"));
  lines.push("name=" + pkg.name);
  lines.push("version=" + pkg.version);
  lines.push("bin=" + JSON.stringify(pkg.bin));
  lines.push("main=" + pkg.main);
  if (pkg.bin && typeof pkg.bin === "string") {
    lines.push("bin_resolved=" + path.join(NEXT_ROOT, pkg.bin) + " exists=" + fs.existsSync(path.join(NEXT_ROOT, pkg.bin)));
  } else if (pkg.bin && typeof pkg.bin === "object") {
    for (const k of Object.keys(pkg.bin)) {
      const p = path.join(NEXT_ROOT, pkg.bin[k]);
      lines.push(`bin[${k}]=${p} exists=${fs.existsSync(p)}`);
    }
  }
  const candidates = [
    path.join(NEXT_ROOT, "dist", "bin", "next"),
    path.join(NEXT_ROOT, "dist", "bin", "next.js"),
    path.join(NEXT_ROOT, "bin", "next"),
    path.join(NEXT_ROOT, "bin", "next.js"),
  ];
  lines.push("--- CLI entry candidates ---");
  for (const c of candidates) lines.push(fs.existsSync(c) ? "FOUND " : "miss  " + c);
} catch (e) {
  lines.push("ERR: " + e.message + "\n" + e.stack);
}
fs.writeFileSync(OUT, lines.join("\n"));
