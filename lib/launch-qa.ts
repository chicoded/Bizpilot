export type LaunchQaSectionId =
  | "environment"
  | "auth"
  | "pos"
  | "inventory"
  | "finance"
  | "team"
  | "integrations"
  | "mobile";

export interface LaunchQaItem {
  id: string;
  section: LaunchQaSectionId;
  title: string;
  description: string;
  href?: string;
  critical?: boolean;
}

export const LAUNCH_QA_SECTIONS: {
  id: LaunchQaSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: "environment",
    title: "Production setup",
    description: "Vercel env vars, database migrations, and health checks.",
  },
  {
    id: "auth",
    title: "Authentication",
    description: "Sign up, sign in, and session flows.",
  },
  {
    id: "team",
    title: "Team & access",
    description: "Invites, roles, and page permissions.",
  },
  {
    id: "pos",
    title: "Point of sale",
    description: "Sales, receipts, and stock accuracy.",
  },
  {
    id: "inventory",
    title: "Inventory",
    description: "Products, stock, barcodes, and pack pricing.",
  },
  {
    id: "finance",
    title: "Finance",
    description: "Debts, expenses, customers, and reports.",
  },
  {
    id: "integrations",
    title: "Integrations",
    description: "Billing, AI assistant, and monitoring.",
  },
  {
    id: "mobile",
    title: "Mobile & PWA",
    description: "Phone usability and install experience.",
  },
];

export const LAUNCH_QA_ITEMS: LaunchQaItem[] = [
  {
    id: "env-vars",
    section: "environment",
    title: "Required env vars set on Vercel",
    description:
      "DATABASE_URL, DIRECT_URL, Clerk keys, and NEXT_PUBLIC_APP_URL are configured. Redeploy after changes.",
    critical: true,
  },
  {
    id: "db-migrate",
    section: "environment",
    title: "Database migrations applied",
    description:
      "Set RUN_PRISMA_MIGRATE=true on Vercel (or run prisma migrate deploy once). Confirm pack pricing column exists.",
    critical: true,
  },
  {
    id: "health-check",
    section: "environment",
    title: "Health endpoint returns healthy",
    description: "GET /api/health should return status healthy in production.",
    critical: true,
  },
  {
    id: "sign-up-in",
    section: "auth",
    title: "Sign up and sign in",
    description: "Create a new account and sign in on production URL.",
    href: "/sign-in",
    critical: true,
  },
  {
    id: "onboarding",
    section: "auth",
    title: "Onboarding creates a business",
    description: "New user completes onboarding and lands on dashboard or get-started.",
    href: "/get-started",
    critical: true,
  },
  {
    id: "invite-team",
    section: "team",
    title: "Invite and accept team member",
    description: "Owner invites staff; invitee accepts and can sign in.",
    href: "/settings/team",
    critical: true,
  },
  {
    id: "rbac-cashier",
    section: "team",
    title: "Cashier cannot access owner pages",
    description:
      "Log in as CASHIER — settings/access, billing, and team pages should be blocked.",
    href: "/settings/access",
    critical: true,
  },
  {
    id: "multi-business",
    section: "team",
    title: "Multi-business data isolation",
    description:
      "Switch between two businesses — products, sales, and customers must not mix.",
    critical: true,
  },
  {
    id: "pos-cash",
    section: "pos",
    title: "Cash sale completes",
    description: "Add items, pay cash, stock decrements, receipt shows.",
    href: "/sales",
    critical: true,
  },
  {
    id: "pos-credit",
    section: "pos",
    title: "Credit sale updates customer debt",
    description: "Credit sale with customer selected increases debt correctly.",
    href: "/sales",
    critical: true,
  },
  {
    id: "pos-concurrent",
    section: "pos",
    title: "Concurrent sale stock protection",
    description:
      "Open two tabs; sell last unit of same product simultaneously — only one should succeed.",
    critical: true,
  },
  {
    id: "pos-receipt",
    section: "pos",
    title: "Receipt print or share",
    description: "Print/share receipt from sales history.",
    href: "/sales/history",
  },
  {
    id: "inventory-add",
    section: "inventory",
    title: "Add and edit product",
    description: "Create product with cost, price, quantity, and category.",
    href: "/inventory/new",
    critical: true,
  },
  {
    id: "inventory-pack",
    section: "inventory",
    title: "Pack pricing (units per pack)",
    description:
      "Add medicine sold in packs — enter pack cost/price, confirm per-unit values in POS.",
    href: "/inventory/new",
  },
  {
    id: "inventory-barcode",
    section: "inventory",
    title: "Barcode scan at POS",
    description: "Scan or enter barcode to add product to cart.",
    href: "/sales",
  },
  {
    id: "inventory-low-stock",
    section: "inventory",
    title: "Low stock alert appears",
    description: "Product below reorder level shows on dashboard and notifications.",
    href: "/dashboard",
  },
  {
    id: "debts-payment",
    section: "finance",
    title: "Record debt payment",
    description: "Pay down customer debt; balance updates on debts page.",
    href: "/debts",
    critical: true,
  },
  {
    id: "expenses-crud",
    section: "finance",
    title: "Add expense",
    description: "Log an expense; appears on dashboard and reports.",
    href: "/expenses",
  },
  {
    id: "customers-crud",
    section: "finance",
    title: "Add customer",
    description: "Create customer for credit sales and debt tracking.",
    href: "/customers",
  },
  {
    id: "reports-export",
    section: "finance",
    title: "Export report (PDF or Excel)",
    description: "Generate and download a report without errors.",
    href: "/reports",
  },
  {
    id: "billing-paystack",
    section: "integrations",
    title: "Paystack upgrade flow (test mode)",
    description: "Start subscription checkout with test keys before going live.",
    href: "/settings/billing",
  },
  {
    id: "ai-chat",
    section: "integrations",
    title: "AI assistant responds",
    description: "GEMINI_API_KEY set — chat returns a useful answer.",
    href: "/ai",
  },
  {
    id: "sentry-monitoring",
    section: "integrations",
    title: "Sentry captures errors",
    description: "SENTRY_DSN set — test error appears in Sentry dashboard.",
  },
  {
    id: "posthog-analytics",
    section: "integrations",
    title: "PostHog captures pageviews",
    description: "NEXT_PUBLIC_POSTHOG_KEY set — events visible in PostHog.",
  },
  {
    id: "mobile-pos",
    section: "mobile",
    title: "POS usable on phone",
    description: "Complete a sale on mobile — cart, checkout, and nav work.",
    href: "/sales",
    critical: true,
  },
  {
    id: "pwa-install",
    section: "mobile",
    title: "Add to home screen",
    description: "Install PWA on Android/iOS and open from home screen.",
  },
];

export function getLaunchQaStorageKey(businessId: string): string {
  return `bizpilot-launch-qa-${businessId}`;
}
