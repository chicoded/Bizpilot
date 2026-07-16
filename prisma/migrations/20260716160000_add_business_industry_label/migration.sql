-- Free-text industry when businesses.industry = OTHER
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "industryLabel" TEXT;
