#!/usr/bin/env node
/**
 * Ensures optional product columns exist before production builds.
 * Idempotent — safe to run on every Vercel deploy when DATABASE_URL is set.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { PRODUCT_SCHEMA_REPAIR_STATEMENTS } from "./product-schema-repair-statements.mjs";

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

const databaseUrl = process.env.DATABASE_URL ?? "";
const directUrl = process.env.DIRECT_URL ?? "";

if (!databaseUrl || databaseUrl.includes("[") || databaseUrl.includes("REPLACE_ME")) {
  console.log("Skipping schema ensure — DATABASE_URL is not configured.");
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
  for (const sql of PRODUCT_SCHEMA_REPAIR_STATEMENTS) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log(
    "✓ Ensured products.imageUrl, barcode, sku, and unitsPerPack columns exist"
  );
} catch (error) {
  console.warn(
    "Could not ensure product schema:",
    error instanceof Error ? error.message : error
  );
} finally {
  await prisma.$disconnect();
}
