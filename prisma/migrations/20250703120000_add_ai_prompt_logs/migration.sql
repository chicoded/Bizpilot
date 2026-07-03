-- Track AI prompt usage per business (trial rate limiting)
CREATE TABLE "ai_prompt_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_prompt_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_prompt_logs_business_id_created_at_idx" ON "ai_prompt_logs"("business_id", "created_at");

ALTER TABLE "ai_prompt_logs" ADD CONSTRAINT "ai_prompt_logs_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
