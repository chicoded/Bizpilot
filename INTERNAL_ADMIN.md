# Zaplex Internal Ops Console (`/internal`)

Staff-only operations console. It is **not** linked from the customer app.

## Access

1. Open **`https://www.zaplex.site/internal/sign-in`** (staff Clerk login).
2. Sign in with a staff email (same Clerk app as customers — no separate Clerk project needed).
3. If the email is allowlisted, you land on `/internal`. Otherwise `/internal/forbidden`.

Customer app login remains at `/sign-in`.

## Bootstrap (first deploy)

Set a comma-separated allowlist of staff emails (becomes `SUPER_ADMIN`):

```bash
INTERNAL_ADMIN_EMAILS=you@company.com,ops@company.com
```

On first successful `/internal` visit, matching emails are upserted into `internal_admins`.

Redeploy after changing the env var (`NEXT_PUBLIC_*` not required for this one, but restart/redeploy so the server picks it up).

## Roles

| Role | Capabilities (summary) |
|------|------------------------|
| `SUPER_ADMIN` | Full access: delete business, change plans, view payments, manage admins |
| `ADMIN` | Manage businesses/users (no delete / no plan changes / no payments) |
| `SUPPORT` | Read-only ops views |
| `FINANCE` | Subscriptions + payments read |
| `DEVELOPER` | Dashboard, businesses view, logs, system |

## Schema

Tables: `internal_admins`, `internal_audit_logs`; column `businesses.suspendedAt`.

Applied by `scripts/ensure-app-schema.mjs` or `database/repair-internal-admin-schema.sql`.

## Suspended tenants

When `suspendedAt` is set, customer routes under `(app)` redirect to `/account-suspended`.
