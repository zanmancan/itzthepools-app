// src/components/ActiveInvitesList.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Invite = {
  id: string;
  email: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  created_at: string;
};

export default function ActiveInvitesList({ leagueId }: { leagueId?: string }) {
  const [invites, setInvites] = useState<Invite[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let aborted = false;
    async function load() {
      if (!leagueId) {
        setInvites([]);
        return;
      }
      setLoading(true);
      const { data, error } = await supabase
        .from("invites")
        .select("id,email,status,created_at")
        .eq("league_id", leagueId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (!aborted) {
        if (error) {
          console.error("Failed to load invites:", error);
          setInvites([]);
        } else {
          setInvites(data as Invite[]);
        }
        setLoading(false);
      }
    }
    load();
    return () => {
      aborted = true;
    };
  }, [leagueId]);

  if (!leagueId) return null; // not in context—render nothing
  if (loading) return <div className="text-sm text-neutral-400">Loading invites…</div>;
  if (!invites || invites.length === 0) {
    return <div className="text-sm text-neutral-500">No pending invites.</div>;
  }

  return (
    <ul className="space-y-2">
      {invites.map((i) => (
        <li key={i.id} className="rounded-md border border-neutral-800 p-3">
          <div className="text-sm font-medium text-neutral-200">{i.email}</div>
          <div className="text-xs text-neutral-500">{i.status} • {new Date(i.created_at).toLocaleString()}</div>
        </li>
      ))}
    </ul>
  );
}
