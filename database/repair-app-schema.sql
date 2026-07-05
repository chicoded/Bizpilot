-- Run in Supabase SQL Editor if inventory, AI assistant, or receipts fail after an update.
-- Safe to run multiple times (idempotent).

-- Product columns (inventory save/load)
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unitsPerPack" INTEGER NOT NULL DEFAULT 1;

-- AI prompt usage tracking (rate limits)
CREATE TABLE IF NOT EXISTS "ai_prompt_logs" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_prompt_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ai_prompt_logs_business_id_created_at_idx"
    ON "ai_prompt_logs"("business_id", "created_at");

DO $$ BEGIN
    ALTER TABLE "ai_prompt_logs"
        ADD CONSTRAINT "ai_prompt_logs_business_id_fkey"
        FOREIGN KEY ("business_id") REFERENCES "businesses"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Receipt numbers (RCP-YYYYMMDD-NNNN)
CREATE TABLE IF NOT EXISTS "receipt_counters" (
    "businessId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("businessId", "dateKey")
);

DO $$ BEGIN
    ALTER TABLE "receipt_counters"
        ADD CONSTRAINT "receipt_counters_businessId_fkey"
        FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;

WITH numbered AS (
    SELECT
        id,
        "businessId",
        TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYYMMDD') AS date_key,
        ROW_NUMBER() OVER (
            PARTITION BY "businessId", TO_CHAR("createdAt" AT TIME ZONE 'UTC', 'YYYYMMDD')
            ORDER BY "createdAt" ASC
        ) AS seq
    FROM "sales"
    WHERE "receiptNumber" IS NULL
)
UPDATE "sales" s
SET "receiptNumber" = 'RCP-' || n.date_key || '-' || LPAD(n.seq::TEXT, 4, '0')
FROM numbered n
WHERE s.id = n.id;

UPDATE "sales"
SET "receiptNumber" = 'RCP-LEGACY-' || UPPER(RIGHT(id, 8))
WHERE "receiptNumber" IS NULL;

INSERT INTO "receipt_counters" ("businessId", "dateKey", "sequence", "updatedAt")
SELECT
    "businessId",
    SUBSTRING("receiptNumber" FROM 5 FOR 8) AS date_key,
    MAX(CAST(RIGHT("receiptNumber", 4) AS INTEGER)) AS sequence,
    CURRENT_TIMESTAMP
FROM "sales"
WHERE "receiptNumber" LIKE 'RCP-________-____'
GROUP BY "businessId", SUBSTRING("receiptNumber" FROM 5 FOR 8)
ON CONFLICT ("businessId", "dateKey") DO UPDATE
SET "sequence" = GREATEST("receipt_counters"."sequence", EXCLUDED."sequence"),
    "updatedAt" = CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "sales_businessId_receiptNumber_key"
    ON "sales"("businessId", "receiptNumber");
