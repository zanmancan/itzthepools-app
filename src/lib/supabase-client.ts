// src/lib/supabase-client.ts
"use client";

/**
 * Client-side Supabase singleton for Next.js App Router.
 * Works with @supabase/auth-helpers-nextjs.
 */
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export const supabase: SupabaseClient = (() => {
  if (_client) return _client;
  _client = createClientComponentClient();
  return _client;
})();
