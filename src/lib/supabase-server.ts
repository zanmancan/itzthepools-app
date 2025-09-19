// src/lib/supabase-server.ts
import { cookies } from "next/headers";
import {
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Use inside Server Components (e.g., layout/page server code) */
export function supabaseServer(): SupabaseClient {
  return createServerComponentClient({ cookies });
}

/** Use inside Route Handlers (e.g., /api/*) */
export function supabaseRoute(): SupabaseClient {
  return createRouteHandlerClient({ cookies });
}
