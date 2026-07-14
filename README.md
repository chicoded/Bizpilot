# BizPilot AI

**The AI Operating System for African SMEs**

BizPilot AI is not bookkeeping software — it's an AI employee for Nigerian small businesses: pharmacies, retail shops, supermarkets, cosmetic stores, and more.

## Features

- **Business Health Score (0–100)** — Instant business health with strengths, warnings, and recommendations
- **AI Assistant** — Natural language queries about sales, inventory, debts, and expenses
- **Point of Sale** — Mobile-first POS with cash, transfer, POS, and credit payments
- **Smart Inventory** — Stock tracking, expiry alerts, barcode support, reorder levels
- **Expense Tracking** — Fuel, rent, salary, transport with AI anomaly detection
- **Debt Management** — Credit sales, due dates, WhatsApp payment reminders
- **Multi-tenant** — Row-level security, role-based access (Owner, Manager, Cashier, Staff)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn UI, Framer Motion |
| Backend | Supabase PostgreSQL, Prisma ORM |
| Auth | Clerk |
| AI | OpenAI GPT-4o-mini |
| Payments | Flutterwave |
| Deploy | Vercel |

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL (Supabase recommended)
- Clerk account
- OpenAI API key (optional — fallback responses work without it)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in:

- `DATABASE_URL` and `DIRECT_URL` — Supabase PostgreSQL connection strings
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` — from [clerk.com](https://clerk.com)
- `OPENAI_API_KEY` — for AI assistant (optional)

### 3. Set up database

```bash
npx prisma db push
# or for migrations:
npx prisma migrate dev --name init
```

Apply RLS policies in Supabase SQL editor:

```bash
# Run database/rls-policies.sql in Supabase
```

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
app/
  (app)/          # Authenticated app routes
    dashboard/    # KPIs + Business Health Score
    sales/        # Point of Sale
    inventory/    # Product management
    expenses/     # Expense tracking
    ai/           # AI chat assistant
    ...
components/       # UI components
features/         # Feature-specific components
lib/              # Utilities, auth, db, validations
actions/          # Server actions
services/         # Business logic
ai/               # AI agents and prompts
database/         # RLS policies
prisma/           # Database schema
types/            # TypeScript types
```

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Done | Authentication + onboarding |
| 2 | ✅ Done | Inventory |
| 3 | ✅ Done | Sales / POS |
| 4 | ✅ Done | Expenses |
| 5 | ✅ Done | Reports + PDF/Excel export |
| 6 | ✅ Done | AI assistant + Health Score |
| 7 | ✅ Done | WhatsApp AI |
| 8 | ✅ Done | Flutterwave subscriptions |
| 9 | ✅ Done | Mobile PWA optimization |
| 10 | ✅ Done | Production deployment |

Full deployment guide: [DEPLOYMENT.md](./DEPLOYMENT.md)

## Business Health Score

The killer feature. Every business gets a score from 0–100 based on:

- Sales trend (7-day vs previous 7-day)
- Profit margins
- Inventory health (low stock, expiring products)
- Cashflow (expense ratio)
- Customer debt ratio

Displayed on the dashboard with actionable recommendations.

## Subscription Plans (NGN)

| Plan | Price | Features |
|------|-------|----------|
| Starter | ₦5,000/mo | Inventory, POS, Basic Reports |
| Business | ₦15,000/mo | + Debt Management, 5 Users |
| AI Pro | ₦30,000/mo | + AI Assistant, Health Score, WhatsApp |

## WhatsApp AI Setup (Phase 7)

1. Create a [Twilio](https://www.twilio.com) account and enable WhatsApp Sandbox
2. Add credentials to `.env.local`:
   ```
   TWILIO_ACCOUNT_SID=AC...
   TWILIO_AUTH_TOKEN=...
   TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
   NEXT_PUBLIC_APP_URL=https://your-domain.com
   ```
3. Run `npx prisma db push` to create WhatsApp tables
4. In Twilio Console, set webhook URL to:
   `https://your-domain.com/api/webhooks/whatsapp`
5. In BizPilot, go to **WhatsApp AI** → Enable → Save
6. Test with the built-in simulator or send a live test message

**Customer examples:**
- "Do you have Paracetamol?"
- "How much is Coke?"
- "What are your opening hours?"

For multiple shops on one Twilio number, customers prefix with business code:
`ABCD1234: Do you have Vitamin C?`

## Flutterwave Billing

1. Create a [Flutterwave](https://flutterwave.com) account (test mode for development)
2. Add to `.env.local` / Vercel:
   ```
   FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST_...
   NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST_...
   FLUTTERWAVE_SECRET_HASH=your_webhook_hash
   NEXT_PUBLIC_APP_URL=https://www.zaplex.site
   ```
3. Go to **Settings → Billing** and subscribe to a plan
4. Webhook URL in Flutterwave Dashboard:
   `https://www.zaplex.site/api/webhooks/flutterwave`

**Plans:** Starter ₦5,000 · Business ₦15,000 · AI Pro ₦30,000/month

Feature gating:
- **Business+** — PDF/Excel report export, debt management
- **AI Pro** — AI Assistant, Business Health Score, WhatsApp AI

## Mobile PWA (Phase 9)

BizPilot installs like a native app on Android and iOS:

1. Deploy with HTTPS (`NEXT_PUBLIC_APP_URL` set to production URL)
2. Open the app in Chrome (Android) or Safari (iOS)
3. Tap **Install App** when prompted, or use browser menu → Add to Home Screen
4. Launch from home screen — full-screen, no browser chrome

**PWA features:**
- Standalone display mode
- Offline detection banner
- Service worker caches pages for faster reload
- `/offline` fallback when network is unavailable
- Fintech-style bottom nav with elevated Sales button
- Safe area support for notched phones
- App shortcuts: POS, Inventory, AI

**Test install locally:** Chrome DevTools → Application → Manifest → check installability

## Production Deployment (Phase 10)

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the complete guide.

Quick start:

```bash
# 1. Push to GitHub and import to Vercel
# 2. Set env vars (DATABASE_URL, Clerk keys, NEXT_PUBLIC_APP_URL)
# 3. Deploy
npx prisma db push   # or migrate deploy

# 4. Verify
curl https://your-domain.com/api/health
```

**Included in this phase:**
- `vercel.json` — build config, EU region (cdg1)
- `/api/health` — database + env health check
- **Sentry** — server + client error tracking
- **PostHog** — analytics + user identification
- **Security headers** — X-Frame-Options, CSP-adjacent policies
- **Rate limiting** — webhook endpoints
- **GitHub Actions CI** — lint + build on PRs
- `global-error.tsx` — graceful error UI

## License

Proprietary — BizPilot AI
