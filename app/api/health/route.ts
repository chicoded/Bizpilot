import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateServerEnv, getAppUrl } from "@/lib/env";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const envCheck = validateServerEnv();
  const started = Date.now();

  let database: "ok" | "error" = "error";
  let databaseLatencyMs = 0;
  let schema: "ok" | "error" = "error";

  if (envCheck.valid) {
    try {
      const dbStart = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      databaseLatencyMs = Date.now() - dbStart;
      database = "ok";

      try {
        await prisma.$queryRaw`SELECT "imageUrl" FROM "products" LIMIT 0`;
        schema = "ok";
      } catch {
        schema = "error";
      }
    } catch {
      database = "error";
    }
  }

  const healthy = envCheck.valid && database === "ok" && schema === "ok";
  const status = healthy ? 200 : 503;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "unhealthy",
      version: process.env.npm_package_version ?? "0.1.0",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
      appUrl: getAppUrl(),
      checks: {
        env: envCheck.valid ? "ok" : "error",
        database,
        schema,
      },
      ...(envCheck.missing.length > 0 && { missingEnv: envCheck.missing }),
      databaseLatencyMs,
      responseTimeMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}
