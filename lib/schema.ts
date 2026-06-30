import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Optional product columns that older databases may be missing. */
export const PRODUCT_OPTIONAL_COLUMNS = [
  {
    name: "imageUrl",
    sql: 'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;',
  },
  {
    name: "barcode",
    sql: 'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "barcode" TEXT;',
  },
  {
    name: "sku",
    sql: 'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "sku" TEXT;',
  },
] as const;

export type ProductColumnName = (typeof PRODUCT_OPTIONAL_COLUMNS)[number]["name"];

export type ProductSchemaStatus = {
  ok: boolean;
  missing: ProductColumnName[];
  present: ProductColumnName[];
};

export type ProductSchemaRepairResult = {
  ok: boolean;
  repaired: ProductColumnName[];
  stillMissing: ProductColumnName[];
  errors: string[];
};

const COLUMN_PROBES: Record<ProductColumnName, () => Promise<unknown>> = {
  imageUrl: () => prisma.$queryRaw`SELECT "imageUrl" FROM "products" LIMIT 0`,
  barcode: () => prisma.$queryRaw`SELECT "barcode" FROM "products" LIMIT 0`,
  sku: () => prisma.$queryRaw`SELECT "sku" FROM "products" LIMIT 0`,
};

function directPrisma(): PrismaClient {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl || directUrl.includes("[") || directUrl.includes("REPLACE_ME")) {
    return prisma;
  }

  return new PrismaClient({
    datasources: { db: { url: directUrl } },
  });
}

async function disconnectIfNeeded(
  client: PrismaClient,
  shouldDisconnect: boolean
) {
  if (shouldDisconnect) {
    await client.$disconnect();
  }
}

export async function checkProductColumn(
  column: ProductColumnName
): Promise<boolean> {
  try {
    await COLUMN_PROBES[column]();
    return true;
  } catch {
    return false;
  }
}

/** @deprecated Use checkProductColumn("imageUrl") */
export async function checkProductImageColumn(): Promise<boolean> {
  return checkProductColumn("imageUrl");
}

/** @deprecated Use checkProductColumn("imageUrl") */
export async function hasProductImageColumn(): Promise<boolean> {
  return checkProductColumn("imageUrl");
}

export async function getProductSchemaStatus(): Promise<ProductSchemaStatus> {
  const present: ProductColumnName[] = [];
  const missing: ProductColumnName[] = [];

  for (const column of PRODUCT_OPTIONAL_COLUMNS) {
    if (await checkProductColumn(column.name)) {
      present.push(column.name);
    } else {
      missing.push(column.name);
    }
  }

  return { ok: missing.length === 0, missing, present };
}

/**
 * Idempotent repair for optional product columns.
 * Uses DIRECT_URL when available because DDL via PgBouncer can fail.
 */
export async function repairProductSchema(): Promise<ProductSchemaRepairResult> {
  const statusBefore = await getProductSchemaStatus();
  if (statusBefore.ok) {
    return { ok: true, repaired: [], stillMissing: [], errors: [] };
  }

  const client = directPrisma();
  const shouldDisconnect = client !== prisma;
  const errors: string[] = [];
  const repaired: ProductColumnName[] = [];

  try {
    for (const column of PRODUCT_OPTIONAL_COLUMNS) {
      if (!statusBefore.missing.includes(column.name)) continue;

      try {
        await client.$executeRawUnsafe(column.sql);
        repaired.push(column.name);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown repair error";
        errors.push(`${column.name}: ${message}`);
        console.error(`[schema] Failed to add products.${column.name}:`, error);
      }
    }
  } finally {
    await disconnectIfNeeded(client, shouldDisconnect);
  }

  const statusAfter = await getProductSchemaStatus();

  return {
    ok: statusAfter.ok,
    repaired,
    stillMissing: statusAfter.missing,
    errors,
  };
}

/** @deprecated Use repairProductSchema() */
export async function ensureProductImageColumn(): Promise<boolean> {
  const result = await repairProductSchema();
  return result.ok;
}

/**
 * Runs on server startup. Logs warnings and auto-repairs missing columns.
 */
export async function validateProductSchemaOnStartup(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    return;
  }

  try {
    const status = await getProductSchemaStatus();

    if (status.ok) {
      console.log("[schema] Product columns OK:", status.present.join(", "));
      return;
    }

    console.warn(
      `[schema] Missing product columns: ${status.missing.join(", ")}`
    );

    const repaired = await repairProductSchema();

    if (repaired.ok) {
      console.log(
        `[schema] Auto-repaired columns: ${
          repaired.repaired.length > 0
            ? repaired.repaired.join(", ")
            : "none needed"
        }`
      );
      return;
    }

    console.error(
      `[schema] Repair incomplete. Still missing: ${repaired.stillMissing.join(", ")}`,
      repaired.errors
    );
  } catch (error) {
    console.error("[schema] Startup validation failed:", error);
  }
}
