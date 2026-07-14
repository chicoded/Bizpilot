-- Safe idempotent repair for offline sale sync column.
-- Run in Supabase SQL Editor if migrate deploy is not used.

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "clientSaleId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_businessId_clientSaleId_key"
  ON "sales" ("businessId", "clientSaleId");
