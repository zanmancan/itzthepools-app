// src/lib/supabaseClient.ts
// Lightweight browser/client Supabase instance.
// Use this ONLY in client components/hooks. For server routes, prefer auth-helpers.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create a singleton client (module scope). Safe in Next.js app router client code.
export const supabaseClient = createClient(url, anon, {
  auth: {
    // Persist session in browser (default). Tweak later if you want cookies-only auth.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
