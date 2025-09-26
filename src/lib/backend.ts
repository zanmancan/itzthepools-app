/**
 * Backend switch scaffold (no logic change yet).
 * Later we’ll use this to route reads/writes to Supabase.
 */
export const USE_SUPABASE =
  process.env.NEXT_PUBLIC_USE_SUPABASE === "1" ||
  process.env.USE_SUPABASE === "1";

// Example usage (future):
// import { USE_SUPABASE } from "@/lib/backend";
// if (USE_SUPABASE) { /* supabase path */ } else { /* in-memory path */ }
