/**
 * Daily keep-alive, so free-tier Supabase does not pause from inactivity.
 *
 * Vercel schedules this through the "crons" block in vercel.json. Netlify has
 * no equivalent config key, so the schedule lives here instead — same job, same
 * time, same endpoint. Losing it on the move would have let the database pause
 * after about a week of quiet, which is exactly the "cloud database sleeping"
 * state we have just spent time making legible.
 */

export default async () => {
  const base = process.env.URL ?? process.env.DEPLOY_PRIME_URL;
  if (!base) {
    console.error("[keep-alive] no site URL available; skipping");
    return new Response("no site url", { status: 500 });
  }

  const secret = process.env.CRON_SECRET;

  try {
    const response = await fetch(`${base}/api/cron/keep-alive`, {
      headers: secret ? { authorization: `Bearer ${secret}` } : undefined,
    });
    const body = await response.text();
    console.log(`[keep-alive] ${response.status} ${body.slice(0, 200)}`);
    return new Response(body, { status: response.status });
  } catch (error) {
    console.error("[keep-alive] failed:", error);
    return new Response("keep-alive failed", { status: 500 });
  }
};

/** 06:00 UTC daily — the same schedule vercel.json uses. */
export const config = {
  schedule: "0 6 * * *",
};
