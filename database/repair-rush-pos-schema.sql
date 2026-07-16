-- Rush POS Engine schema (restaurant / fast food / cafe)
-- Idempotent — safe in Supabase SQL Editor.

DO $$ BEGIN
  ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'RESTAURANT';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'FAST_FOOD';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TYPE "Industry" ADD VALUE IF NOT EXISTS 'CAFE';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "KitchenOrderStatus" AS ENUM ('PENDING', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RestaurantServiceType" AS ENUM ('WALK_IN', 'DINE_IN', 'PICKUP', 'DELIVERY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "restaurant_settings" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "rushModeEnabled" BOOLEAN NOT NULL DEFAULT true,
  "voiceOrdersEnabled" BOOLEAN NOT NULL DEFAULT false,
  "aiSuggestionsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "comboMealsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "kitchenDisplayEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "restaurant_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "restaurant_settings_businessId_key" ON "restaurant_settings"("businessId");

DO $$ BEGIN
  ALTER TABLE "restaurant_settings"
    ADD CONSTRAINT "restaurant_settings_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "meal_combos" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meal_combos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "meal_combos_businessId_isActive_idx" ON "meal_combos"("businessId", "isActive");

DO $$ BEGIN
  ALTER TABLE "meal_combos"
    ADD CONSTRAINT "meal_combos_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "meal_combo_items" (
  "id" TEXT NOT NULL,
  "comboId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "meal_combo_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "meal_combo_items_comboId_productId_key" ON "meal_combo_items"("comboId", "productId");

DO $$ BEGIN
  ALTER TABLE "meal_combo_items"
    ADD CONSTRAINT "meal_combo_items_comboId_fkey"
    FOREIGN KEY ("comboId") REFERENCES "meal_combos"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "meal_combo_items"
    ADD CONSTRAINT "meal_combo_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "favorite_products" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "favorite_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "favorite_products_businessId_productId_key" ON "favorite_products"("businessId", "productId");

DO $$ BEGIN
  ALTER TABLE "favorite_products"
    ADD CONSTRAINT "favorite_products_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "favorite_products"
    ADD CONSTRAINT "favorite_products_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "kitchen_orders" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "saleId" TEXT,
  "orderNumber" TEXT NOT NULL,
  "serviceType" "RestaurantServiceType" NOT NULL DEFAULT 'WALK_IN',
  "status" "KitchenOrderStatus" NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readyAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "kitchen_orders_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "kitchen_orders_businessId_orderNumber_key" ON "kitchen_orders"("businessId", "orderNumber");

DO $$ BEGIN
  ALTER TABLE "kitchen_orders"
    ADD CONSTRAINT "kitchen_orders_businessId_fkey"
    FOREIGN KEY ("businessId") REFERENCES "businesses"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "kitchen_order_items" (
  "id" TEXT NOT NULL,
  "kitchenOrderId" TEXT NOT NULL,
  "productId" TEXT,
  "productName" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "notes" TEXT,
  CONSTRAINT "kitchen_order_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "kitchen_order_items_kitchenOrderId_idx" ON "kitchen_order_items"("kitchenOrderId");

DO $$ BEGIN
  ALTER TABLE "kitchen_order_items"
    ADD CONSTRAINT "kitchen_order_items_kitchenOrderId_fkey"
    FOREIGN KEY ("kitchenOrderId") REFERENCES "kitchen_orders"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "kitchen_order_items"
    ADD CONSTRAINT "kitchen_order_items_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "products_businessId_category_idx" ON "products"("businessId", "category");
