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

const directUrl = process.env.DIRECT_URL;
const prisma = new PrismaClient(
  directUrl ? { datasources: { db: { url: directUrl } } } : undefined
);

try {
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products'
    ORDER BY ordinal_position
  `;
  console.log("products columns:", JSON.stringify(columns, null, 2));

  await prisma.$queryRaw`SELECT "imageUrl" FROM "products" LIMIT 1`;
  console.log("imageUrl probe: ok");

  const count = await prisma.product.count();
  console.log("product count:", count);

  const sample = await prisma.product.findMany({
    take: 3,
    select: inventoryListSelect,
  });
  console.log("sample products:", JSON.stringify(sample, null, 2));

  const businesses = await prisma.business.count();
  console.log("business count:", businesses);
} catch (error) {
  console.error("DIAGNOSTIC FAILED:", error);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
