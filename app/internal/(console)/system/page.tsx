import { requireInternalAdmin } from "@/lib/internal/auth";
import { prisma } from "@/lib/db";
import { validateServerEnv, getAppUrl, PRODUCTION_ENV_CHECKLIST } from "@/lib/env";
import { getProductSchemaStatus } from "@/lib/schema";
import { isProductImageUploadEnabled } from "@/lib/product-images";

export default async function InternalSystemPage() {
  await requireInternalAdmin("system:view");

  const envCheck = validateServerEnv();
  let database: "ok" | "error" = "error";
  let databaseLatencyMs = 0;
  let schema: "ok" | "error" = "error";
  let missingColumns: string[] = [];
  let adminCount = 0;
  let businessCount = 0;

  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    databaseLatencyMs = Date.now() - started;
    database = "ok";
  } catch {
    database = "error";
  }

  try {
    const status = await getProductSchemaStatus();
    schema = status.ok ? "ok" : "error";
    missingColumns = status.missing;
  } catch {
    schema = "error";
  }

  try {
    adminCount = await prisma.internalAdmin.count();
    businessCount = await prisma.business.count();
  } catch {
    // ignore
  }

  const allowlistConfigured = Boolean(
    (process.env.INTERNAL_ADMIN_EMAILS ?? "").trim()
  );

  const checks = [
    { label: "Required env", ok: envCheck.valid, detail: envCheck.valid ? "ok" : `missing: ${envCheck.missing.join(", ")}` },
    { label: "Database ping", ok: database === "ok", detail: database === "ok" ? `${databaseLatencyMs}ms` : "unreachable" },
    { label: "Product schema", ok: schema === "ok", detail: schema === "ok" ? "ok" : `missing: ${missingColumns.join(", ") || "unknown"}` },
    { label: "Product images", ok: isProductImageUploadEnabled(), detail: isProductImageUploadEnabled() ? "configured" : "SUPABASE_SERVICE_ROLE_KEY missing" },
    { label: "Staff allowlist env", ok: allowlistConfigured, detail: allowlistConfigured ? "INTERNAL_ADMIN_EMAILS set" : "not set (bootstrap disabled)" },
    { label: "Staff rows", ok: adminCount > 0, detail: `${adminCount} internal_admins` },
    { label: "Businesses", ok: true, detail: String(businessCount) },
    { label: "App URL", ok: true, detail: getAppUrl() },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">System</h1>
        <p className="text-sm text-slate-400">
          Health and configuration checks for Zaplex Ops (Phase 2).
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {checks.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-200">{c.label}</p>
              <span
                className={
                  c.ok
                    ? "text-xs font-semibold text-emerald-400"
                    : "text-xs font-semibold text-red-400"
                }
              >
                {c.ok ? "OK" : "ISSUE"}
              </span>
            </div>
            <p className="mt-2 break-all text-xs text-slate-500">{c.detail}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-slate-800 p-4">
        <h2 className="text-sm font-semibold text-white">Env checklist</h2>
        <ul className="mt-3 space-y-1 text-xs text-slate-400">
          {PRODUCTION_ENV_CHECKLIST.map((item) => (
            <li key={item.key} className="flex justify-between gap-3 border-b border-slate-800/60 py-1.5">
              <span className="font-mono text-slate-300">{item.key}</span>
              <span>
                {item.required ? "required" : "optional"} · {item.service}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-slate-500">
        Keep-alive cron: <span className="font-mono">/api/cron/keep-alive</span>{" "}
        (daily). Impersonation is not enabled — open a business in a private
        window with a test account instead.
      </p>
    </div>
  );
}
