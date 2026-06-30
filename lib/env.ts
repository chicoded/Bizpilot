import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().optional(),
  CLERK_SECRET_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function validateServerEnv(): {
  valid: boolean;
  missing: string[];
} {
  const required = ["DATABASE_URL", "CLERK_SECRET_KEY"] as const;
  const missing = required.filter((key) => !process.env[key]);
  return { valid: missing.length === 0, missing: [...missing] };
}

export function getServerEnv(): ServerEnv {
  return serverEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
    NODE_ENV: process.env.NODE_ENV,
  });
}

export function getPublicEnv() {
  return publicEnvSchema.safeParse({
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  });
}

export function getAppUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const deploymentHost = process.env.VERCEL_URL;

  const isLocalConfigured =
    configured?.includes("localhost") || configured?.includes("127.0.0.1");

  // Prefer explicit production URL when it is not a local dev value.
  if (configured && !isLocalConfigured) {
    return configured;
  }

  // On Vercel, fall back to the live deployment domain (fixes localhost in prod).
  if (productionHost) {
    return `https://${productionHost}`;
  }

  if (deploymentHost) {
    return `https://${deploymentHost}`;
  }

  if (configured) {
    return configured;
  }

  return "http://localhost:3000";
}

export const PRODUCTION_ENV_CHECKLIST = [
  { key: "DATABASE_URL", required: true, service: "Supabase" },
  { key: "DIRECT_URL", required: true, service: "Supabase migrations" },
  { key: "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", required: true, service: "Clerk" },
  { key: "CLERK_SECRET_KEY", required: true, service: "Clerk" },
  { key: "NEXT_PUBLIC_APP_URL", required: true, service: "Vercel" },
  { key: "OPENAI_API_KEY", required: false, service: "OpenAI" },
  { key: "PAYSTACK_SECRET_KEY", required: false, service: "Paystack" },
  { key: "NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY", required: false, service: "Paystack" },
  { key: "TWILIO_ACCOUNT_SID", required: false, service: "WhatsApp" },
  { key: "SENTRY_DSN", required: false, service: "Sentry" },
  { key: "NEXT_PUBLIC_POSTHOG_KEY", required: false, service: "PostHog" },
] as const;
