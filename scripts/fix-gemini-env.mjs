import { readFileSync, writeFileSync, existsSync } from "node:fs";

const path = ".env.local";
if (!existsSync(path)) {
  console.log("No .env.local file found");
  process.exit(1);
}

const lines = readFileSync(path, "utf8").split(/\r?\n/);
let changed = false;

const fixed = lines.map((line) => {
  if (/^Gemini API Key\s*=/.test(line)) {
    changed = true;
    const value = line.slice(line.indexOf("=") + 1).trim();
    return `GEMINI_API_KEY=${value}`;
  }
  return line;
});

if (!changed) {
  console.log("No 'Gemini API Key' line found — check GEMINI_API_KEY is set correctly.");
  process.exit(0);
}

writeFileSync(path, fixed.join("\n"));
console.log("Fixed: renamed 'Gemini API Key' to GEMINI_API_KEY in .env.local");
console.log("Restart npm run dev for changes to take effect.");
