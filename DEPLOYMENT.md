# BizPilot AI — Production Deployment Guide

Deploy BizPilot AI to **Vercel** with **Supabase**, **Clerk**, and optional integrations.

## Prerequisites

- [GitHub](https://github.com) repository
- [Vercel](https://vercel.com) account
- [Supabase](https://supabase.com) project (PostgreSQL)
- [Clerk](https://clerk.com) application
- Domain (optional)

---

## Step 1: Database (Supabase)

1. Create a Supabase project
2. Go to **Settings → Database → Connection string**
3. Use the **Transaction pooler** URL for `DATABASE_URL` (port 6543, `?pgbouncer=true`)
4. Use the **Direct** URL for `DIRECT_URL` (port 5432, migrations)

```env
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

5. Push schema:

```bash
npx prisma db push
# or for production migrations:
npx prisma migrate deploy
```

6. Run RLS policies: paste `database/rls-policies.sql` in Supabase SQL Editor

---

## Step 2: Clerk Authentication

1. Create a Clerk app at [clerk.com](https://clerk.com)
2. Copy **Publishable key** and **Secret key**
3. Set paths in Clerk Dashboard:
   - Sign-in URL: `/sign-in`
   - Sign-up URL: `/sign-up`
   - After sign-in: `/dashboard`
   - After sign-up: `/onboarding`
4. Add your production domain to **Allowed origins** and **Redirect URLs**
5. For Vercel preview deploys, also allow `https://*.vercel.app`

---

## Step 3: Deploy to Vercel

### Quick start (GitHub → Vercel)

1. **Push your latest code** to `https://github.com/chicoded/Bizpilot`
2. Go to [vercel.com/new](https://vercel.com/new) → **Import** the `Bizpilot` repo
3. Framework: **Next.js** (auto-detected)
4. Build command: leave default — uses `vercel.json` → `prisma generate && prisma migrate deploy && next build`
5. Copy env vars from [`vercel.env.example`](./vercel.env.example) into **Environment Variables**
6. Click **Deploy**

After the first deploy, set `NEXT_PUBLIC_APP_URL` to your real Vercel URL (e.g. `https://bizpilot-xxx.vercel.app`) and **redeploy**.

### Option A: Git integration (recommended)

1. Push code to GitHub
2. Import project at [vercel.com/new](https://vercel.com/new)
3. Framework preset: **Next.js**
4. Add all environment variables (see checklist below)
5. Deploy

### Option B: Vercel CLI

```bash
npm i -g vercel
vercel login
vercel link
vercel env pull .env.local
vercel --prod
```

---

## Step 4: Environment Variables (Vercel Dashboard)

Set these in **Project → Settings → Environment Variables** for Production, Preview, and Development as needed.

### Required

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase pooler connection string |
| `DIRECT_URL` | Supabase direct connection (migrations) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |

### Recommended

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | AI assistant |
| `PAYSTACK_SECRET_KEY` | Billing (live key in production) |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Billing |
| `SENTRY_DSN` | Error monitoring |
| `NEXT_PUBLIC_SENTRY_DSN` | Client-side Sentry |
| `NEXT_PUBLIC_POSTHOG_KEY` | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | `https://app.posthog.com` |

### Optional integrations

| Variable | Description |
|----------|-------------|
| `TWILIO_ACCOUNT_SID` | WhatsApp AI |
| `TWILIO_AUTH_TOKEN` | WhatsApp AI |
| `TWILIO_WHATSAPP_NUMBER` | WhatsApp sender |
| `RESEND_API_KEY` | Email notifications |
| `PAYSTACK_PLAN_*` | Recurring subscription plan codes |

---

## Step 5: Webhooks (production URLs)

After deploy, configure webhooks with your production URL:

| Service | URL |
|---------|-----|
| Paystack | `https://your-domain.com/api/webhooks/paystack` |
| Twilio WhatsApp | `https://your-domain.com/api/webhooks/whatsapp` |
| Clerk | `https://your-domain.com/api/webhooks/clerk` (if using) |

Update `NEXT_PUBLIC_APP_URL` to match your production domain.

---

## Step 6: Verify deployment

```bash
curl https://your-domain.com/api/health
```

Expected response:

```json
{
  "status": "healthy",
  "checks": { "env": "ok", "database": "ok" }
}
```

### Manual checklist

- [ ] Sign up / sign in works
- [ ] Onboarding creates business
- [ ] Dashboard loads KPIs
- [ ] POS sale completes
- [ ] Paystack test payment (then switch to live keys)
- [ ] PWA install on mobile
- [ ] Sentry receives test error (optional)
- [ ] PostHog captures pageviews (optional)

---

## Step 7: Custom domain

1. Vercel → Project → **Domains** → Add domain
2. Update DNS records as instructed
3. Update `NEXT_PUBLIC_APP_URL` to custom domain
4. Update Clerk allowed origins
5. Redeploy

---

## Monitoring

### Sentry

1. Create project at [sentry.io](https://sentry.io)
2. Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN`
3. Errors auto-captured via `instrumentation.ts` and `global-error.tsx`

### PostHog

1. Create project at [posthog.com](https://posthog.com)
2. Set `NEXT_PUBLIC_POSTHOG_KEY`
3. User identification via Clerk on authenticated routes

---

## Security notes

- Never commit `.env` files
- Use **live** Paystack keys only in production
- Rotate secrets if exposed
- Enable Supabase RLS policies
- Clerk protects all routes except public pages and webhooks

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Build fails on Prisma | Ensure `postinstall` runs `prisma generate` |
| DB connection timeout | Use Supabase pooler URL for `DATABASE_URL` |
| Clerk redirect loop | Check `NEXT_PUBLIC_APP_URL` matches deployed URL |
| Webhooks 401 | Verify webhook URLs and secrets |
| PWA not installable | Requires HTTPS and valid manifest |

---

## CI/CD

GitHub Actions runs lint + build on every PR (`.github/workflows/ci.yml`).

Vercel automatically deploys:
- **Production** — pushes to `main`
- **Preview** — pull requests
