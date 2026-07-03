-- CreateTable
CREATE TABLE "receipt_counters" (
    "businessId" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_counters_pkey" PRIMARY KEY ("businessId","dateKey")
);

-- Add receipt number column (nullable for backfill)
ALTER TABLE "sales" ADD COLUMN "receiptNumber" TEXT;

-- Backfill existing sales with RCP-YYYYMMDD-NNNN per business per UTC day
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
)
UPDATE "sales" s
SET "receiptNumber" = 'RCP-' || n.date_key || '-' || LPAD(n.seq::TEXT, 4, '0')
FROM numbered n
WHERE s.id = n.id;

-- Seed counters from backfilled receipts
INSERT INTO "receipt_counters" ("businessId", "dateKey", "sequence", "updatedAt")
SELECT
    "businessId",
    SUBSTRING("receiptNumber" FROM 5 FOR 8) AS date_key,
    MAX(CAST(RIGHT("receiptNumber", 4) AS INTEGER)) AS sequence,
    CURRENT_TIMESTAMP
FROM "sales"
WHERE "receiptNumber" IS NOT NULL
GROUP BY "businessId", SUBSTRING("receiptNumber" FROM 5 FOR 8)
ON CONFLICT ("businessId", "dateKey") DO UPDATE
SET "sequence" = GREATEST("receipt_counters"."sequence", EXCLUDED."sequence"),
    "updatedAt" = CURRENT_TIMESTAMP;

ALTER TABLE "sales" ALTER COLUMN "receiptNumber" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "sales_businessId_receiptNumber_key" ON "sales"("businessId", "receiptNumber");

-- AddForeignKey
ALTER TABLE "receipt_counters" ADD CONSTRAINT "receipt_counters_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
