-- Safe idempotent repair for optional products columns.
-- Run in Supabase SQL Editor or via: node scripts/ensure-product-schema.mjs
-- Keep in sync with PRODUCT_OPTIONAL_COLUMNS in lib/schema.ts

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER NOT NULL DEFAULT 1;
