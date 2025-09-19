// src/components/JoinFromToken.tsx
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Legacy helper: if we land on a generic join page with ?token=abc,
 * just redirect to /join/[token] which is already handled by your App Router page.
 */
export default function JoinFromToken() {
  const router = useRouter();
  const search = useSearchParams();

  useEffect(() => {
    const token = search.get("token") || search.get("t");
    if (token) {
      router.replace(`/join/${encodeURIComponent(token)}`);
    }
  }, [router, search]);

  return null;
}
