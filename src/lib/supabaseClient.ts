// src/lib/supabaseClient.ts
// Browser/client-side Supabase singleton for App Router client components.
// NOTE: We export it under multiple names to satisfy older imports in the repo.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseClient = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// --- Exports ---
// Named export used in new code:
export { supabaseClient };
// Back-compat for code that does: `import { supabase } from "@/lib/supabaseClient"`
export { supabaseClient as supabase };
// Default export for code that does: `import supabase from "@/lib/supabaseClient"`
export default supabaseClient;
