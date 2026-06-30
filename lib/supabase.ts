import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.includes("[PROJECT]") || value === "") {
    throw new Error(
      `Missing ${name}. Add it to .env.local from Supabase → Project Settings → API.`
    );
  }
  return value;
}

function getSupabaseAnonKey(): string {
  const value =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value || value.includes("[PROJECT]") || value === "") {
    throw new Error(
      "Missing Supabase anon/publishable key. Add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local (Supabase → API Keys)."
    );
  }
  return value;
}

/** Browser / anon client — for client components and realtime. */
export function createBrowserSupabaseClient(): SupabaseClient {
  return createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), getSupabaseAnonKey());
}

/** Server-only admin client — bypasses RLS. Never expose to the browser. */
export function createServerSupabaseClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";
  return Boolean(url && anon && !url.includes("[PROJECT]"));
}
