// src/lib/supabaseServer.ts
import { cookies } from "next/headers";
import {
  createServerComponentClient,
  createRouteHandlerClient,
} from "@supabase/auth-helpers-nextjs";
import type { SupabaseClient } from "@supabase/supabase-js";

/** For Server Components (layout/page server code) */
export function supabaseServer(): SupabaseClient {
  return createServerComponentClient({ cookies });
}

/** For Route Handlers (/api/*) */
export function supabaseRoute(): SupabaseClient {
  return createRouteHandlerClient({ cookies });
}
