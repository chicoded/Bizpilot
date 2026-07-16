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
  `ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);`,
  `DO $$ BEGIN
    CREATE TYPE "InternalAdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'DEVELOPER');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "internal_admins" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "InternalAdminRole" NOT NULL DEFAULT 'SUPPORT',
    "disabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_admins_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "internal_admins_userId_key" ON "internal_admins"("userId");`,
  `CREATE INDEX IF NOT EXISTS "internal_admins_role_idx" ON "internal_admins"("role");`,
  `DO $$ BEGIN
    ALTER TABLE "internal_admins"
      ADD CONSTRAINT "internal_admins_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "users"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "internal_audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "internal_audit_logs_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "internal_audit_logs_createdAt_idx" ON "internal_audit_logs"("createdAt");`,
  `CREATE INDEX IF NOT EXISTS "internal_audit_logs_actorUserId_createdAt_idx" ON "internal_audit_logs"("actorUserId", "createdAt");`,
  `DO $$ BEGIN
    ALTER TABLE "internal_audit_logs"
      ADD CONSTRAINT "internal_audit_logs_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  // Rush POS Engine (restaurant / fast food / cafe)
  `DO $$ BEGIN
    ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'RESTAURANT';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'FAST_FOOD';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'CAFE';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "KitchenOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "RestaurantServiceType" AS ENUM ('WALK_IN', 'DINE_IN', 'PICKUP', 'DELIVERY');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "restaurant_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "rushModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "voiceOrdersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "aiSuggestionsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "comboMealsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kitchenDisplayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "restaurant_settings_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_settings_businessId_key" ON "restaurant_settings"("businessId");`,
  `DO $$ BEGIN
    ALTER TABLE "restaurant_settings"
      ADD CONSTRAINT "restaurant_settings_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "meal_combos" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "price" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "meal_combos_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "meal_combos_businessId_isActive_idx" ON "meal_combos"("businessId", "isActive");`,
  `DO $$ BEGIN
    ALTER TABLE "meal_combos"
      ADD CONSTRAINT "meal_combos_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "meal_combo_items" (
    "id" TEXT NOT NULL,
    "comboId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    CONSTRAINT "meal_combo_items_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "meal_combo_items_comboId_productId_key" ON "meal_combo_items"("comboId", "productId");`,
  `CREATE INDEX IF NOT EXISTS "meal_combo_items_productId_idx" ON "meal_combo_items"("productId");`,
  `DO $$ BEGIN
    ALTER TABLE "meal_combo_items"
      ADD CONSTRAINT "meal_combo_items_comboId_fkey"
      FOREIGN KEY ("comboId") REFERENCES "meal_combos"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "meal_combo_items"
      ADD CONSTRAINT "meal_combo_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "favorite_products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "favorite_products_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "favorite_products_businessId_productId_key" ON "favorite_products"("businessId", "productId");`,
  `CREATE INDEX IF NOT EXISTS "favorite_products_businessId_sortOrder_idx" ON "favorite_products"("businessId", "sortOrder");`,
  `DO $$ BEGIN
    ALTER TABLE "favorite_products"
      ADD CONSTRAINT "favorite_products_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "favorite_products"
      ADD CONSTRAINT "favorite_products_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "kitchen_orders" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "saleId" TEXT,
    "orderNumber" TEXT NOT NULL,
    "serviceType" "RestaurantServiceType" NOT NULL DEFAULT 'WALK_IN',
    "status" "KitchenOrderStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readyAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "kitchen_orders_businessId_orderNumber_key" ON "kitchen_orders"("businessId", "orderNumber");`,
  `CREATE INDEX IF NOT EXISTS "kitchen_orders_businessId_status_createdAt_idx" ON "kitchen_orders"("businessId", "status", "createdAt");`,
  `DO $$ BEGIN
    ALTER TABLE "kitchen_orders"
      ADD CONSTRAINT "kitchen_orders_businessId_fkey"
      FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE TABLE IF NOT EXISTS "kitchen_order_items" (
    "id" TEXT NOT NULL,
    "kitchenOrderId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    CONSTRAINT "kitchen_order_items_pkey" PRIMARY KEY ("id")
  );`,
  `CREATE INDEX IF NOT EXISTS "kitchen_order_items_kitchenOrderId_idx" ON "kitchen_order_items"("kitchenOrderId");`,
  `DO $$ BEGIN
    ALTER TABLE "kitchen_order_items"
      ADD CONSTRAINT "kitchen_order_items_kitchenOrderId_fkey"
      FOREIGN KEY ("kitchenOrderId") REFERENCES "kitchen_orders"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `DO $$ BEGIN
    ALTER TABLE "kitchen_order_items"
      ADD CONSTRAINT "kitchen_order_items_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "products"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$;`,
  `CREATE INDEX IF NOT EXISTS "products_businessId_category_idx" ON "products"("businessId", "category");`,
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
  console.log("✓ Ensured app schema (AI, receipts, internal admin, rush POS)");
} catch (error) {
  console.warn(
    "Could not ensure app schema:",
    error instanceof Error ? error.message : error
  );
} finally {
  await prisma.$disconnect();
}
