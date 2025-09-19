// lib/supabase/client.ts
"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";
import { env } from "@/lib/env";

// Create a singleton browser client (safe for client components)
let _client:
  | ReturnType<typeof createBrowserClient<Database>>
  | null = null;

export function createClient() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return _client;
}

// Export a ready-to-use instance for legacy imports.
export const supabase = createClient();
