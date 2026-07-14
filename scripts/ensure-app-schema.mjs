#!/usr/bin/env node
/**
 * Ensures AI + receipt schema exists before production builds.
 * Idempotent — safe on every Vercel deploy when DATABASE_URL is set.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env.local");

const REPAIR_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS "ai_prompt_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_prompt_logs_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "ai_prompt_logs_business_id_created_at_idx"
    ON "ai_prompt_logs"("business_id", "created_at");`,
  `DO $$ BEGIN
    ALTER TABLE "ai_prompt_logs"
      ADD CONSTRAINT "ai_prompt_logs_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "receipt_counters" (
    "businessId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("businessId", "dateKey")
  );`,
  `DO $$ BEGIN
    ALTER TABLE "receipt_counters"
      ADD CONSTRAINT "receipt_counters_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;`,
  `WITH numbered AS (
    SELECT
      id,
      "businessId",
      TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYYMMDD') AS date_key,
      ROW_NUMBER() OVER (
        PARTITION BY "businessId", TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYYMMDD')
        ORDER BY "createdAt" ASC
      ) AS seq
    FROM "sales"
    WHERE "receiptNumber" IS NULL
  )
  UPDATE "sales" s
  SET "receiptNumber" = 'RCP-' || n.date_key || '-' || LPAD(n.seq::TEXT, 4, '0')
  FROM numbered n
  WHERE s.id = n.id;`,
  `UPDATE "sales"
   SET "receiptNumber" = 'RCP-LEGACY-' || UPPER(RIGHT(id, 8))
   WHERE "receiptNumber" IS NULL;`,
  `INSERT INTO "receipt_counters" ("businessId", "dateKey", "sequence", "updatedAt")
   SELECT
     "businessId",
     SUBSTRING("receiptNumber" FROM 5 FOR 8) AS date_key,
     MAX(CAST(RIGHT("receiptNumber", 4) AS INTEGER)) AS sequence,
     CURRENT_TIMESTAMP
   FROM "sales"
   WHERE "receiptNumber" LIKE 'RCP-________-____'
   GROUP BY "businessId", SUBSTRING("receiptNumber" FROM 5 FOR 8)
   ON CONFLICT ("businessId", "dateKey") DO UPDATE
   SET "sequence" = GREATEST("receipt_counters"."sequence", EXCLUDED."sequence"),
       "updatedAt" = CURRENT_TIMESTAMP;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sales_businessId_receiptNumber_key"
    ON "sales"("businessId", "receiptNumber");`,
  `ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "clientSaleId" TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sales_businessId_clientSaleId_key"
    ON "sales"("businessId", "clientSaleId");`,
];

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

const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";

if (!databaseUrl || databaseUrl.includes("[") || databaseUrl.includes("REPLACE_ME")) {
  console.log("Skipping app schema ensure — DATABASE_URL is not configured.");
  process.exit(0);
}

const prisma = new PrismaClient(
  directUrl
    ? {
        datasources: {
          db: { url: directUrl },
        },
      }
    : undefined
);

try {
  for (const sql of REPAIR_STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log("✓ Ensured ai_prompt_logs, receipt_counters, and sales.receiptNumber");
} catch (error) {
  console.warn(
    "Could not ensure app schema:",
    error instanceof Error ? error.message : error
  );
} finally {
  await prisma.$disconnect();
}
