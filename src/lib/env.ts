// /lib/env.ts
// Centralized, typed access to env vars with nice errors.
// Supports both your current TC_* names and the plain names.

function must(name: string, value: string | undefined) {
  if (!value || value.trim() === "") {
    throw new Error(
      `[env] Missing "${name}". Set it in Netlify (and .env.local for dev).`
    );
  }
  return value;
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  process.env.NEXT_PUBLIC_TC_SUPABASE_URL;

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_TC_SUPABASE_ANON_KEY;

// Best-effort site URL for redirects (works on Netlify/Vercel/local)
const inferredSiteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.NEXT_PUBLIC_NETLIFY_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ??
  "http://localhost:3000";

export const env = {
  supabaseUrl: must("NEXT_PUBLIC_SUPABASE_URL (or NEXT_PUBLIC_TC_SUPABASE_URL)", SUPABASE_URL),
  supabaseAnonKey: must(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY (or NEXT_PUBLIC_TC_SUPABASE_ANON_KEY)",
    SUPABASE_ANON_KEY
  ),
  siteUrl: inferredSiteUrl,
} as const;
