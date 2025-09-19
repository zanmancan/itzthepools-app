// src/components/RequireTeamName.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient"; // <- singleton instance

type RequireTeamNameProps = {
  children: ReactNode;
  /** Tooltip text shown when user doesn't have a team name yet */
  tooltip?: string;
};

export default function RequireTeamName({ children, tooltip }: RequireTeamNameProps) {
  // Supabase singleton instance (do NOT call it as a function)
  const sb = supabaseClient;

  // null = we haven't checked yet; true/false once we know
  const [hasName, setHasName] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Get current user (if not signed in, they obviously don't have a team name here)
      const { data: userData, error: userErr } = await sb.auth.getUser();

      if (userErr) {
        console.error("RequireTeamName: getUser error", userErr);
        if (!cancelled) setHasName(false);
        return;
      }

      const user = userData?.user;
      if (!user) {
        if (!cancelled) setHasName(false);
        return;
      }

      // 2) Look up their team_name from profiles
      const { data, error } = await sb
        .from("profiles")
        .select("team_name")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("RequireTeamName: profiles query error", error);
        if (!cancelled) setHasName(false);
        return;
      }

      if (!cancelled) setHasName(!!data?.team_name);
    })();

    return () => {
      cancelled = true;
    };
    // sb is a stable module singleton; no need to include it in deps
  }, []);

  // Still loading
  if (hasName === null) {
    return (
      <div className="inline-flex items-center rounded-md bg-neutral-800 px-3 py-2 text-neutral-300">
        Loading…
      </div>
    );
  }

  // OK to render children if user has a name
  if (hasName) return <>{children}</>;

  // Otherwise, render children but visually/interaction disabled with a hint
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
