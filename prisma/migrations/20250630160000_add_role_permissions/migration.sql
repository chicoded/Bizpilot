-- Add per-role page access permissions (owner-configurable JSON)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "rolePermissions" JSONB;
