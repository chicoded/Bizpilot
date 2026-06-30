-- Run once in Supabase SQL Editor if inventory fails with a missing imageUrl column.
-- Safe to re-run: uses IF NOT EXISTS.
-- See also: database/repair-product-schema.sql

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
