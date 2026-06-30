-- CreateTable
CREATE TABLE IF NOT EXISTS "team_invites" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_invites_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_token_key" ON "team_invites"("token");
CREATE UNIQUE INDEX IF NOT EXISTS "team_invites_businessId_email_key" ON "team_invites"("businessId", "email");
CREATE INDEX IF NOT EXISTS "team_invites_businessId_idx" ON "team_invites"("businessId");

ALTER TABLE "team_invites" DROP CONSTRAINT IF EXISTS "team_invites_businessId_fkey";
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_businessId_fkey"
  FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "team_invites" DROP CONSTRAINT IF EXISTS "team_invites_invitedBy_fkey";
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_invitedBy_fkey"
  FOREIGN KEY ("invitedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
