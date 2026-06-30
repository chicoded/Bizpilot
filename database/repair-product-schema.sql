-- Safe idempotent repair for optional products columns.
-- Run in Supabase SQL Editor or via: node scripts/ensure-product-schema.mjs

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
