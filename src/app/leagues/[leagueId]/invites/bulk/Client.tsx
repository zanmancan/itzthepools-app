"use client";

/**
 * Bulk Invites client
 * - Fetches dev context JSON (tests assert `"role":"owner"`)
 * - If role !== "owner": render a 403 guard with the test ids the spec expects
 * - If role === "owner": show the form, validate emails client-side,
 *   POST to /api/invites/create, then refresh GET /api/leagues/:id/invites
 * - Renders semantic <ul>/<li data-testid="invite-row"> for Playwright
 */

import React from "react";

type InviteItem = {
  id?: string;
  email: string;
  token?: string;
  used?: boolean;
  created_at?: string;
  expires_at?: string | null;
};

type ListResponse = {
  ok: boolean;
  leagueId?: string;
  count?: number;
  items?: InviteItem[];
  invites?: InviteItem[];
  error?: string;
};

type CreateResponse = {
  ok: boolean;
  leagueId?: string;
  counts?: { requested: number; created: number; duplicates: number };
  invites?: { token: string; email: string }[];
  items?: { email: string; token: string }[];
  results?: { email: string; status: string }[];
  error?: string;
};

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function splitEmails(text: string) {
  const raw = (text || "").split(/[\s,;]+/g).map(s => s.trim()).filter(Boolean);
  const dedup = Array.from(new Set(raw.map(s => s.toLowerCase())));
  const valid = dedup.filter(isEmail);
  const invalid = dedup.filter(e => !isEmail(e));
  return { valid, invalid };
}

export default function Client({ leagueId }: { leagueId: string }) {
  const [text, setText] = React.useState("a@x.com b@y.com c@z.com");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [items, setItems] = React.useState<InviteItem[]>([]);
  const [ctx, setCtx] = React.useState<any>(null); // dev context JSON

  // Fetch dev context (includes role + leagueId); the test looks for this JSON
  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/invites/context?leagueId=${encodeURIComponent(leagueId)}`, { cache: "no-store" });
        const j = await res.json().catch(() => ({}));
        setCtx(j);
      } catch { /* ignore */ }
    })();
  }, [leagueId]);

  // Fetch current list
  const refresh = React.useCallback(async () => {
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/invites`, { cache: "no-store" });
      const data: ListResponse = await res.json().catch(() => ({ ok: false, error: "bad json" }));
      if (!res.ok || !data.ok) throw new Error(data.error || `list ${res.status}`);
      setItems((data.items ?? data.invites ?? []).filter(Boolean));
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  }, [leagueId]);

  React.useEffect(() => { refresh(); }, [refresh]);

  // Create invites
  const onCreate = async () => {
    const { valid, invalid } = splitEmails(text);
    if (invalid.length > 0 || valid.length === 0) {
      setError("invalid email"); // spec expects this copy
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/invites/create`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leagueId, emails: valid.join(",") }),
      });
      const data: CreateResponse = await res.json().catch(() => ({ ok: false, error: "bad json" }));
      if (!res.ok || !data.ok) throw new Error(data.error || `create ${res.status}`);
      await refresh();
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  // --- UI ---
  const role = ctx?.role; // typically 'owner' or 'member'

  return (
    <div className="space-y-4" data-testid="bulk-invites-page">
      {/* DEV badge and visible context JSON (keeps previous behavior) */}
      <div className="inline-flex items-center gap-2 rounded border border-amber-500/40 bg-amber-200/10 px-2 py-1 text-xs">
        <span>DEV</span><span className="opacity-70">league:</span><span className="font-mono">{leagueId}</span>
      </div>
      {ctx && (
        <pre className="rounded-md bg-white/5 p-2 text-xs font-mono leading-5" data-testid="dev-context">
{JSON.stringify(ctx, null, 2)}
        </pre>
      )}

      {/* === GUARD: non-owners see a visible 403 card with expected testids === */}
      {role && role !== "owner" ? (
        <div
          className="rounded-md border border-red-500/30 bg-red-500/10 p-4"
          data-testid="guard-403"
          role="alert"
        >
          <div className="font-semibold">403</div>
          <div className="opacity-80">You must be the league owner to manage bulk invites.</div>
          {process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" && (
            <div
              className="mt-2 inline-flex items-center gap-2 rounded border border-amber-400/40 bg-amber-200/10 px-2 py-1 text-[10px] text-amber-200"
              data-testid="guard-403-dev-banner"
            >
              <span>Dev</span><span>role:</span><span className="font-mono">{String(role)}</span>
            </div>
          )}
        </div>
      ) : (
        /* === OWNER VIEW === */
        <>
          <section>
            <div className="text-lg font-semibold">Bulk Invites</div>
            <div className="mt-1 text-xs opacity-70">Paste emails (comma/space/newline separated)</div>

            <textarea
              className="mt-2 w-full rounded-md border border-white/10 bg-black/20 p-3 font-mono"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              data-testid="bulk-textarea"
            />

            <div className="mt-3">
              <button
                type="button"
                className="rounded-md bg-sky-600/80 px-3 py-1.5 text-sm font-semibold hover:bg-sky-600/90 disabled:opacity-50"
                onClick={onCreate}
                disabled={loading}
              >
                {loading ? "Creating…" : "Create invites"}
              </button>
            </div>

            {error && (
              <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1 text-sm text-red-300">
                {error}
              </div>
            )}
          </section>

          <section className="mt-6">
            <div className="text-sm font-semibold">Results</div>
            {items.length ? (
              <ul data-testid="bulk-results" className="mt-2 space-y-1">
                {items.map((it) => (
                  <li key={it.token ?? it.email} data-testid="invite-row" className="opacity-90">
                    {it.email}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="opacity-60" data-testid="bulk-results-empty">
                (no invites yet)
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
