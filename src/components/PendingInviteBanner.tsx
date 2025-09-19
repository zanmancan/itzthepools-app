"use client";

import { useEffect, useState } from "react";
import { getPendingInvite, clearPendingInvite } from "@/lib/pendingInvite";
import Link from "next/link";

export default function PendingInviteBanner() {
  const [token, setToken] = useState<string | null>(null);
  const [meta, setMeta] = useState<{name: string; ruleset: string; season: string} | null>(null);

  useEffect(() => {
    const t = getPendingInvite();
    setToken(t);
    (async () => {
      if (!t) return;
      try {
        const res = await fetch(`/api/invites/${t}`);
        if (!res.ok) { clearPendingInvite(); setToken(null); return; }
        const data = await res.json();
        if (data.status !== "ok") { clearPendingInvite(); setToken(null); return; }
        setMeta({ name: data.leagueName, ruleset: data.ruleset, season: data.season });
      } catch {
        // ignore
      }
    })();
  }, []);

  if (!token || !meta) return null;

  return (
    <div className="card border border-blue-700/50">
      <div className="font-medium">You have a pending league invite</div>
      <div className="opacity-80 text-sm mt-1">
        {meta.name} — {meta.ruleset} / {meta.season}
      </div>
      <div className="mt-2 flex gap-2">
        <Link className="btn" href={`/join/${token}`}>Review & Accept</Link>
        <button className="btn" onClick={() => { clearPendingInvite(); location.reload(); }}>Dismiss</button>
      </div>
    </div>
  );
}
