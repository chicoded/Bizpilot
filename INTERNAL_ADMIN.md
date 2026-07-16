# Zaplex Internal Ops Console (`/internal`)

Staff-only operations console. It is **not** linked from the customer app.

## Access

1. Open **`https://www.zaplex.site/internal/sign-in`** (staff Clerk login).
2. Sign in with a staff email (same Clerk app as customers — no separate Clerk project needed).
3. If the email is allowlisted **or** already in `internal_admins`, you land on `/internal`. Otherwise `/internal/forbidden`.

Customer app login remains at `/sign-in`.

## Bootstrap (first deploy)

Set a comma-separated allowlist of staff emails (becomes `SUPER_ADMIN`):

```bash
INTERNAL_ADMIN_EMAILS=you@company.com,ops@company.com
```

On first successful `/internal` visit, matching emails are upserted into `internal_admins`.

Redeploy after changing the env var.

## Phase 2 features

| Area | Route / UI | What you can do |
|------|------------|-----------------|
| Staff invites | `/internal/admins` | Grant access by email, change roles, enable/disable |
| Trial tools | Business detail | **Extend trial +7/14/30d**, edit plan/status |
| Billing filters | `/internal/payments`, `/internal/subscriptions` | Search + status filters |
| System health | `/internal/system` | DB/env/schema checks (no secrets shown) |

**Staff invite rule:** the person must have signed into Zaplex once first (so a `users` row exists), then SUPER_ADMIN grants them a role on `/internal/admins`.

## Roles

| Role | Capabilities (summary) |
|------|------------------------|
| `SUPER_ADMIN` | Full access: delete business, change plans, payments, manage admins |
| `ADMIN` | Manage businesses/users (no delete / no plan write / no payments / no admin grant) |
| `SUPPORT` | Read-only ops views |
| `FINANCE` | Subscriptions + payments read |
| `DEVELOPER` | Dashboard, businesses view, logs, system |

## Schema

Tables: `internal_admins`, `internal_audit_logs`; column `businesses.suspendedAt`.

Applied by `scripts/ensure-app-schema.mjs` or `database/repair-internal-admin-schema.sql`.

## Suspended tenants

When `suspendedAt` is set, customer routes under `(app)` redirect to `/account-suspended`.

## Not in Phase 2

- Customer impersonation (use a test account instead)
- Provider-side refund API initiation (filter failed/success payments; refund in Flutterwave/Paystack dashboard)
