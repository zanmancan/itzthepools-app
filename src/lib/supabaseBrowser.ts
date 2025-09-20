// src/lib/supabaseBrowser.ts
// Client-side Supabase that sets cookies (not just localStorage)
// so your server can see the session.
import { createBrowserClient } from "@supabase/ssr";

export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
