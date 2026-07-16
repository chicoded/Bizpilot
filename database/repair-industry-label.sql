-- Run in Supabase SQL Editor if custom industry on onboarding fails.
-- Safe to run multiple times.

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "industryLabel" TEXT;
