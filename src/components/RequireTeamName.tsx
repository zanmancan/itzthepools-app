// src/components/RequireTeamName.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

type RequireTeamNameProps = {
  children: ReactNode;
  tooltip?: string;
};

export default function RequireTeamName({ children, tooltip }: RequireTeamNameProps) {
  // Supabase client is a stable singleton instance
  const sb = supabaseClient;

  const [hasName, setHasName] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    // Prefix with `void` so eslint knows we intentionally fire-and-forget this IIFE.
    void (async () => {
      const { data: userData, error: userErr } = await sb.auth.getUser();
      if (userErr) {
        console.error("RequireTeamName:getUser", userErr);
        if (!cancelled) setHasName(false);
        return;
      }

      const user = userData?.user;
      if (!user) {
        if (!cancelled) setHasName(false);
        return;
      }

      const { data, error } = await sb
        .from("profiles")
        .select("team_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("RequireTeamName:profiles", error);
        if (!cancelled) setHasName(false);
        return;
      }

      if (!cancelled) setHasName(!!data?.team_name);
    })();

    return () => {
      cancelled = true;
    };
    // include sb to satisfy exhaustive-deps; it's a stable singleton so no re-renders.
  }, [sb]);

  if (hasName === null) {
    return (
      <div className="inline-flex items-center rounded-md bg-neutral-800 px-3 py-2 text-neutral-300">
        Loading…
      </div>
    );
  }

  if (hasName) return <>{children}</>;

  const hint = tooltip ?? "Set a Team Name first";
  return (
    <div
      className="group relative inline-flex cursor-not-allowed items-center opacity-60"
      title={hint}
      aria-disabled="true"
    >
      {children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 opacity-0 shadow group-hover:opacity-100">
        {hint}
      </span>
    </div>
  );
}
