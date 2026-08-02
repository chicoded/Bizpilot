# Deploying Zaplex to Netlify

Netlify runs Next.js on its Node runtime, so Prisma talks to Supabase exactly
as it does on Vercel. No driver adapter, no edge port, no code changes beyond
what is already committed.

Nothing in here needs the Vercel project to be deleted — both configs live in
the repo and neither interferes with the other.

---

## 1. Connect the repository

In the Netlify dashboard: **Add new site → Import an existing project → GitHub →
`chicoded/Bizpilot`**.

Leave the build settings alone. `netlify.toml` already sets them:

| Setting | Value |
| --- | --- |
| Build command | `node scripts/deploy-build.mjs` |
| Publish directory | `.next` |
| Node version | 20 |

---

## 2. Copy the environment variables

**Site configuration → Environment variables → Import from a .env file** is the
fastest route. Pull the current values from Vercel first:

```bash
npx vercel env pull .env.production
```

Then paste that file into Netlify's import box, and **delete
`.env.production` afterwards** — it holds live secrets and must never be
committed.

### Required — the site will not work without these

| Variable | Where it comes from |
| --- | --- |
| `DATABASE_URL` | Supabase → Project Settings → Database → transaction pooler, port 6543 |
| `DIRECT_URL` | Same page, direct connection, port 5432 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → API. Server-only, never expose |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk → API keys |
| `CLERK_SECRET_KEY` | Clerk → API keys |

### Set after the first deploy

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | Your real Netlify URL, then redeploy |

Until this is set the app falls back to Netlify's `URL`, so the first deploy
still works — it is just cleaner to pin it.

### Optional — features degrade quietly without them

`GEMINI_API_KEY` or `OPENAI_API_KEY` (assistant), `FLUTTERWAVE_*` (billing),
`TWILIO_*` (WhatsApp), `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` (error
reporting), `NEXT_PUBLIC_POSTHOG_*` (analytics), `NEXT_PUBLIC_SUPPORT_*`
(support contacts), `CRON_SECRET` (protects the keep-alive endpoint),
`INTERNAL_ADMIN_EMAILS` (staff console access).

---

## 3. Point Clerk and Supabase at the new domain

Both hold allow-lists that will reject the new origin until updated.

- **Clerk → Domains**: add the Netlify URL. Sign-in fails silently otherwise.
- **Supabase → Authentication → URL Configuration**: add it to redirect URLs.

---

## 4. Move the domain

Once the Netlify deploy is confirmed working, move `www.zaplex.site` across:
**Domain management → Add a domain**. Netlify will give you the DNS records.

Do this last. While the domain still points at Vercel you can test the Netlify
URL freely without touching the live site.

---

## 5. Check it came up

```bash
curl -i https://<your-site>.netlify.app/api/health
```

- `200` with `"status":"healthy"` — everything is up.
- `200` with `"status":"degraded"` — database is fine, an optional product
  column is missing. Run `database/repair-product-schema.sql` in Supabase.
- `503` — environment variables or the database connection are wrong.

---

## What carries over, and what does not

**Carries over automatically:** the daily Supabase keep-alive. Vercel scheduled
it through `vercel.json`; Netlify has no equivalent config key, so it now lives
in `netlify/functions/keep-alive.mts` on the same 06:00 UTC schedule. Without
it, free-tier Supabase pauses after about a week of quiet.

**Watch on the first deploy:** the security headers in `next.config.ts` are
applied by Next itself and follow the app anywhere. The caching headers in
`netlify.toml` mirror what `vercel.json` did — health, service worker and auth
pages must never be served stale.

**Why the move happened:** Fast Origin Transfer hit 30.42 GB against a 10 GB
limit, caused by the team sync re-downloading the full catalogue every 25
seconds. That is fixed in `lib/sync/state.ts` and should now sit near 1.4 GB a
month for eight tills. Netlify's free allowance is 100 GB, so there is a lot of
room — but the fix is what matters, not the ceiling.
