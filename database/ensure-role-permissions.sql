-- Ensure rolePermissions column exists on businesses
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "rolePermissions" JSONB;
