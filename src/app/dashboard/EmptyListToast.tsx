// src/app/dashboard/EmptyListToast.tsx
"use client";

import { useEffect } from "react";
import { useToast } from "@/components/Toast";

export default function EmptyListToast({ hasLeagues }: { hasLeagues: boolean }) {
  const { addToast } = useToast();

  useEffect(() => {
    if (!hasLeagues) {
      // Your addToast likely has signature (message: string, variant?: "success" | "error")
      // so we omit the variant (or you could pass "success").
      addToast("No leagues yet — create one or join to get started.");
    }
  }, [hasLeagues, addToast]);

  return null;
}
