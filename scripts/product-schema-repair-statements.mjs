/**
 * Keep in sync with PRODUCT_OPTIONAL_COLUMNS in lib/schema.ts
 * Used by ensure-product-schema.mjs on every Vercel deploy.
 */
export const PRODUCT_SCHEMA_REPAIR_STATEMENTS = [
  'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;',
  'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;',
  'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;',
  'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER NOT NULL DEFAULT 1;',
];
