// lib/env.ts
// Build-time validation to keep only NEXT_PUBLIC_* on the client.
// We deliberately DO NOT allow server secrets here.

import { z } from "zod";

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10),
  // Add other NEXT_PUBLIC_* as needed
});

const raw = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

// Guard against accidentally exposing server secrets by naming.
const forbidden = Object.keys(process.env).filter(
  (k) =>
    (k.startsWith("SUPABASE_") || k.includes("SERVICE_ROLE") || k.includes("DATABASE_URL")) &&
    // if someone accidentally prefixed a secret with NEXT_PUBLIC_, scream:
    k.startsWith("NEXT_PUBLIC_")
);
if (forbidden.length) {
  throw new Error(
    `Security error: found dangerous keys exposed to the client: ${forbidden.join(
      ", "
    )}. Remove them or rename without NEXT_PUBLIC_.`
  );
}

export const env = clientSchema.parse(raw);
