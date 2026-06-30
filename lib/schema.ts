import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";
function directPrisma(): PrismaClient {
  const directUrl = process.env.DIRECT_URL;
  if (!directUrl || directUrl.includes("[")) {
    return prisma;
  }

  return new PrismaClient({
    datasources: { db: { url: directUrl } },
  });
}

/**
 * Idempotent schema repair for production databases created before imageUrl
 * was added. Uses DIRECT_URL when available (DDL via pooler can fail).
 */
export async function ensureProductImageColumn(): Promise<boolean> {
  const client = directPrisma();
  const shouldDisconnect = client !== prisma;

  try {
    await client.$executeRawUnsafe(
      'ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;'
    );
    return true;
  } catch (error) {
    console.error("ensureProductImageColumn failed:", error);
    return false;
  } finally {
    if (shouldDisconnect) {
      await client.$disconnect();
    }
  }
}

export async function checkProductImageColumn(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT "imageUrl" FROM "products" LIMIT 0`;
    return true;
  } catch {
    return false;
  }
}

/** Cached per request — inventory pages do not probe the schema repeatedly. */
export const hasProductImageColumn = cache(checkProductImageColumn);