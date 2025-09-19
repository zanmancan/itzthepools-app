// src/components/JoinFromToken.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * If we land on a generic join page with ?token=abc (or ?t=abc),
 * redirect to /join/[token] which is handled by the App Router.
 */
export default function JoinFromToken() {
  const router = useRouter();
  const search = useSearchParams();

  // ✅ Strict-safe: guard access in case types are widened under strict mode
  const token = search?.get("token") || search?.get("t") || "";

  useEffect(() => {
    if (!token) return;
    router.replace(`/join/${encodeURIComponent(token)}`);
  }, [router, token]); // react-friendly dep: use the derived token, not the unstable `search` object

  return null;
}
