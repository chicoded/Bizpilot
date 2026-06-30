#!/usr/bin/env node
/**
 * Push Prisma schema to Supabase PostgreSQL.
 * Requires DATABASE_URL + DIRECT_URL in .env.local (see .env.example).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnvFile(envPath);

// Prisma reads `.env` by default — sync DB vars from .env.local
if (process.env.DATABASE_URL) {
  const envForPrisma = [
    `DATABASE_URL=${JSON.stringify(process.env.DATABASE_URL)}`,
    `DIRECT_URL=${JSON.stringify(process.env.DIRECT_URL ?? "")}`,
  ].join("\n") + "\n";
  writeFileSync(resolve(root, ".env"), envForPrisma);
}

const placeholders = ["[PASSWORD]", "[PROJECT]", "[REF]", "[REGION]", "REPLACE_ME", "[YOUR-PASSWORD]"];
const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";

function hasPlaceholder(value) {
  return !value || placeholders.some((p) => value.includes(p));
}

if (hasPlaceholder(databaseUrl) || hasPlaceholder(directUrl)) {
  console.error("\n❌ Supabase database URLs are not configured.\n");
  console.error("1. Create a project at https://supabase.com/dashboard");
  console.error("2. Open Settings → Database → Connection string");
  console.error("3. Copy into .env.local:\n");
  console.error("   DATABASE_URL  → Transaction pooler (port 6543, ?pgbouncer=true)");
  console.error("   DIRECT_URL    → Direct connection (port 5432)\n");
  console.error("4. Re-run: npm run db:setup\n");
  process.exit(1);
}

console.log("→ Generating Prisma client...");
execSync("npx prisma generate", { cwd: root, stdio: "inherit" });

console.log("\n→ Pushing schema to Supabase...");
execSync("npx prisma db push", { cwd: root, stdio: "inherit" });

console.log("\n✅ Database schema is on Supabase.");
console.log("\nNext steps:");
console.log("  1. Supabase Dashboard → SQL Editor → run database/rls-policies.sql");
console.log("  2. Add Clerk keys to .env.local");
console.log("  3. npm run dev\n");
