-- Hybrid restaurant inventory: product types + recipe BOM
DO $$ BEGIN
  CREATE TYPE "ProductType" AS ENUM ('MENU_ITEM', 'READY_MADE', 'INGREDIENT', 'PACKAGING', 'SERVICE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "productType" "ProductType" NOT NULL DEFAULT 'READY_MADE';
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "prepTimeMinutes" INTEGER;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isPopular" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isChefSpecial" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "tracksStock" BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "products_businessId_productType_idx"
  ON "products"("businessId", "productType");

CREATE TABLE IF NOT EXISTS "recipe_lines" (
  "id" TEXT NOT NULL,
  "parentProductId" TEXT NOT NULL,
  "componentId" TEXT NOT NULL,
  "quantity" DECIMAL(12,4) NOT NULL,
  CONSTRAINT "recipe_lines_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "recipe_lines_parentProductId_componentId_key"
  ON "recipe_lines"("parentProductId", "componentId");
CREATE INDEX IF NOT EXISTS "recipe_lines_componentId_idx"
  ON "recipe_lines"("componentId");

DO $$ BEGIN
  ALTER TABLE "recipe_lines"
    ADD CONSTRAINT "recipe_lines_parentProductId_fkey"
    FOREIGN KEY ("parentProductId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "recipe_lines"
    ADD CONSTRAINT "recipe_lines_componentId_fkey"
    FOREIGN KEY ("componentId") REFERENCES "products"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
