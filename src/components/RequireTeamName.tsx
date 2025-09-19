// components/RequireTeamName.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { supabaseClient } from "@/lib/supabaseClient";

export default function RequireTeamName(props: {
  children: ReactNode;
  tooltip?: string;
}) {
  const sb = supabaseClient();
  const [hasName, setHasName] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        setHasName(false);
        return;
      }
      const { data, error } = await sb
        .from("profiles")
        .select("team_name")
        .eq("id", user.id)
        .single();
      if (error) {
        console.error(error);
        setHasName(false);
        return;
      }
      setHasName(!!data?.team_name);
    })();
  }, [sb]);

  if (hasName === null) {
    return (
      <div className="inline-flex items-center rounded-md bg-neutral-800 px-3 py-2 text-neutral-300">
        Loading…
      </div>
    );
  }

  if (hasName) return <>{props.children}</>;

  return (
    <div
      className="group relative inline-flex cursor-not-allowed items-center opacity-60"
      title={props.tooltip ?? "Set a Team Name first"}
    >
      {props.children}
      <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-md bg-neutral-800 px-2 py-1 text-xs text-neutral-200 opacity-0 shadow group-hover:opacity-100">
        {props.tooltip ?? "Set a Team Name first"}
      </span>
    </div>
  );
}
