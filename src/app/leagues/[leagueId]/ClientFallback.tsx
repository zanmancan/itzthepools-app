"use client";

import { useEffect, useState } from "react";

export default function ClientFallback({ leagueId }: { leagueId: string }) {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/test/leagues/get?id=${encodeURIComponent(leagueId)}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const j = await res.json().catch(() => ({}));
        if (!alive) return;
        setName(j?.league?.name ?? "League");
      } catch {
        if (!alive) return;
        setName("League");
      }
    })();
    return () => { alive = false; };
  }, [leagueId]);

  return (
    <section className="space-y-4" data-testid="league-page">
      <header className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h1 className="text-xl font-semibold" data-testid="league-header">
          {name ?? "League"}
        </h1>
        <p className="text-xs text-neutral-400">
          League ID: <code className="opacity-75">{leagueId}</code>
        </p>
      </header>
    </section>
  );
}
