import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateServerEnv, getAppUrl } from "@/lib/env";
import { isProductImageUploadEnabled } from "@/lib/product-images";
import { getProductSchemaStatus } from "@/lib/schema";
import { isDetailedHealthAuthorized } from "@/lib/health-auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const detailed = isDetailedHealthAuthorized(request);
  const envCheck = validateServerEnv();
  const started = Date.now();

  let database: "ok" | "error" = "error";
  let databaseLatencyMs = 0;
  let schema: "ok" | "error" = "error";
  let missingColumns: string[] = [];

  if (envCheck.valid) {
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - dbStart;
      database = "ok";

      const status = await getProductSchemaStatus();
      if (status.ok) {
        schema = "ok";
      } else {
        schema = "error";
        if (detailed) {
          missingColumns = status.missing;
        }
      }
    } catch {
      database = "error";
    }
  }

  /**
   * Reachability and completeness are different questions, and only the first
   * one belongs in the status code.
   *
   * The optional product columns are optional by design — the code omits them
   * when absent and carries on. Failing the health check on a missing column
   * made the app report "Cloud database sleeping" at a database that was awake
   * and answering, because the sync banner reads this endpoint and a 503 is
   * the only thing it can interpret.
   */
  const reachable = envCheck.valid && database === "ok";
  const healthy = reachable && schema === "ok";
  const statusCode = reachable ? 200 : 503;
  const status = healthy ? "healthy" : reachable ? "degraded" : "unhealthy";

  if (!detailed) {
    return NextResponse.json({ status }, { status: statusCode });
  }

  return NextResponse.json(
    {
      status,
      version: process.env.npm_package_version ?? "0.1.0",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      appUrl: getAppUrl(),
      checks: {
        env: envCheck.valid ? "ok" : "error",
        database,
        schema,
        productImages: isProductImageUploadEnabled() ? "ok" : "error",
      },
      ...(missingColumns.length > 0 && { missingColumns }),
      ...(envCheck.missing.length > 0 && { missingEnv: envCheck.missing }),
      databaseLatencyMs,
      responseTimeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}
