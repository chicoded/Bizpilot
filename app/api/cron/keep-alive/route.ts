import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Scheduled keep-alive so free-tier Supabase does not pause from inactivity.
 * Configure Vercel Cron + optional CRON_SECRET.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      database: "awake",
      latencyMs: Date.now() - started,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Retry once — cold start after pause.
    try {
      await new Promise((r) => setTimeout(r, 3000));
      await prisma.$queryRaw`SELECT 1`;
      return NextResponse.json({
        ok: true,
        database: "woke",
        latencyMs: Date.now() - started,
        timestamp: new Date().toISOString(),
      });
    } catch {
      return NextResponse.json(
        {
          ok: false,
          database: "sleeping",
          error: error instanceof Error ? error.message : "DB unreachable",
          latencyMs: Date.now() - started,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      );
    }
  }
}
