-- Idempotent repair for Internal Ops console tables.
-- Run in Supabase SQL Editor, or rely on scripts/ensure-app-schema.mjs on deploy.

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "suspendedAt" TIMESTAMP(3);

DO $$ BEGIN
  CREATE TYPE "InternalAdminRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'FINANCE', 'DEVELOPER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "internal_admins" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "InternalAdminRole" NOT NULL DEFAULT 'SUPPORT',
  "disabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_admins_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "internal_admins_userId_key" ON "internal_admins"("userId");
CREATE INDEX IF NOT EXISTS "internal_admins_role_idx" ON "internal_admins"("role");

DO $$ BEGIN
  ALTER TABLE "internal_admins"
    ADD CONSTRAINT "internal_admins_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "internal_audit_logs" (
  "id" TEXT NOT NULL,
  "actorUserId" TEXT,
  "action" TEXT NOT NULL,
  "entity" TEXT,
  "entityId" TEXT,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "internal_audit_logs_createdAt_idx" ON "internal_audit_logs"("createdAt");
CREATE INDEX IF NOT EXISTS "internal_audit_logs_actorUserId_createdAt_idx" ON "internal_audit_logs"("actorUserId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "internal_audit_logs"
    ADD CONSTRAINT "internal_audit_logs_actorUserId_fkey"
    FOREIGN KEY ("actorUserId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
