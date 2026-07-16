# Zaplex Internal Ops Console (`/internal`)

Staff-only operations console. It is **not** linked from the customer app.

## Access

1. Sign in with Clerk using a staff email.
2. Open `https://www.zaplex.site/internal` (or local `http://localhost:3000/internal`).
3. Unauthorized users are redirected to `/internal/forbidden` (access denied).

## Bootstrap (first deploy)

Set a comma-separated allowlist of staff emails (becomes `SUPER_ADMIN`):

```bash
INTERNAL_ADMIN_EMAILS=you@company.com,ops@company.com
```

On first visit, matching emails are upserted into `internal_admins`.

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
