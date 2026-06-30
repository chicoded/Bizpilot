#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
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

const directUrl = process.env.DIRECT_URL ?? "";
if (!directUrl) {
  console.log("Skipping — DIRECT_URL not set");
  process.exit(0);
}

const prisma = new PrismaClient({
  datasources: { db: { url: directUrl } },
});

const statements = [
  `CREATE TABLE IF NOT EXISTS "team_invites" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_token_key" ON "team_invites"("token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_businessId_email_key" ON "team_invites"("businessId", "email")`,
  `CREATE INDEX IF NOT EXISTS "team_invites_businessId_idx" ON "team_invites"("businessId")`,
  `ALTER TABLE "team_invites" DROP CONSTRAINT IF EXISTS "team_invites_businessId_fkey"`,
  `ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE`,
  `ALTER TABLE "team_invites" DROP CONSTRAINT IF EXISTS "team_invites_invitedBy_fkey"`,
  `ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE`,
];

try {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ team_invites table ready");
} catch (error) {
  console.warn(
    "Could not apply team_invites migration:",
    error instanceof Error ? error.message : error
  );
} finally {
  await prisma.$disconnect();
}
