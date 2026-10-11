const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, ".verify-shims.txt");
const lines = [];
const checks = [
  "node_modules/.bin/next.cmd",
  "node_modules/.bin/prisma.cmd",
  "node_modules/.bin/npx.cmd",
  "node_modules/next/dist/bin/next",
  "node_modules/@prisma/client/index.js",
  "node_modules/lucide-react/dist/esm/icons/home.mjs",
  "node_modules/@radix-ui/react-slot/package.json",
];
for (const c of checks) {
  const p = path.join(ROOT, ...c.split(/[\\/]/));
  lines.push((fs.existsSync(p) ? "OK   " : "MISS ") + c);
}
fs.writeFileSync(OUT, lines.join("\n"));
