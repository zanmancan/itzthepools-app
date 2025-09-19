// lib/supabaseClient.ts
// Legacy shim so both `supabase` and `supabaseClient` work.

export { supabase } from "@/lib/supabase/client";

// Back-compat named export expected by components
export { supabase as supabaseClient } from "@/lib/supabase/client";
