const fs = require("node:fs");
const path = require("node:path");
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(PROJECT_ROOT, ".deps-check.txt");
const checks = [
  path.join(PROJECT_ROOT, "node_modules"),
  path.join(PROJECT_ROOT, "node_modules", ".bin"),
  path.join(PROJECT_ROOT, "node_modules", ".bin", "next.cmd"),
  path.join(PROJECT_ROOT, "node_modules", "next"),
  path.join(PROJECT_ROOT, "node_modules", "@prisma"),
  path.join(PROJECT_ROOT, "node_modules", "lucide-react"),
  path.join(PROJECT_ROOT, "node_modules", "@radix-ui"),
  path.join(PROJECT_ROOT, "node_modules", "clsx"),
  path.join(PROJECT_ROOT, "node_modules", "tailwindcss"),
];
const lines = [];
for (const p of checks) {
  lines.push(`${fs.existsSync(p) ? "EXISTS" : "MISSING"}  ${p}`);
}
lines.push(`\npackage.json deps (keys):`);
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"));
  Object.keys(pkg.dependencies || {}).slice(0, 30).forEach((k) => lines.push("  dep: " + k));
} catch (e) {
  lines.push("  err: " + e.message);
}
fs.writeFileSync(OUT, lines.join("\n"));
process.exit(0);
