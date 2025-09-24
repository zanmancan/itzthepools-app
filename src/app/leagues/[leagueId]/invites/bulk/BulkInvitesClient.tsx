"use client";

/**
 * BulkInvitesClient
 * - Paste emails (comma/semicolon/newline separated)
 * - Calls /api/invites/bulk-create
 * - Shows per-email results + summary
 * - Lists current pending invites via /api/invites/list
 * - Revoke invite via /api/invites/revoke
 */

import { useEffect, useMemo, useState } from "react";

type ResultRow =
  | { email: string; status: "created"; token: string; url: string }
  | { email: string; status: "duplicate" }
  | { email: string; status: "invalid"; reason: "invalid_format" }
  | { email: string; status: "unknown" };

type Invite = {
  id: string;
  email: string | null;
  token: string;
  is_public: boolean;
  created_at: string;
  expires_at: string | null;
  accepted: boolean;
  pending: boolean;
};

export default function BulkInvitesClient({ leagueId }: { leagueId: string }) {
  const [emailsText, setEmailsText] = useState("");
  const [expiresDays, setExpiresDays] = useState<number>(14);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [q, setQ] = useState("");

  const filteredInvites = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return invites;
    return invites.filter((i) => (i.email || "").toLowerCase().includes(s) || i.token.includes(s));
  }, [invites, q]);

  async function refreshInvites() {
    try {
      const url = `/api/invites/list?${new URLSearchParams({ league_id: leagueId })}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json();
      if (j.ok) setInvites(j.invites);
    } catch (e) {
      console.error("invite list load error", e);
    }
  }

  useEffect(() => {
    refreshInvites();
  }, [leagueId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSummary(null);
    setResults([]);
    try {
      const res = await fetch("/api/invites/bulk-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          emails: emailsText,
          expiresDays,
        }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        alert(`Bulk create failed: ${j?.error || res.statusText}`);
      } else {
        setSummary(j.summary);
        setResults(j.results);
        setEmailsText("");
        await refreshInvites();
      }
    } catch (err: any) {
      alert(`Network error: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  async function revokeInvite(token: string) {
    const ok = confirm("Revoke this invite?");
    if (!ok) return;
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ league_id: leagueId, token }),
      });
      const j = await res.json();
      if (!j.ok) {
        alert(`Revoke failed: ${j.error || "unknown"}`);
      }
      await refreshInvites();
    } catch (e: any) {
      alert(`Network error: ${e?.message || e}`);
    }
  }

  return (
    <div className="space-y-8">
      {/* Paste box */}
      <form className="space-y-3" onSubmit={onSubmit}>
        <label className="block text-sm font-medium">
          Paste emails <span className="text-gray-500">(comma/semicolon/newline separated)</span>
        </label>
        <textarea
          className="w-full border rounded p-3 min-h-[140px]"
          placeholder="alice@example.com, bob@example.com, ..."
          value={emailsText}
          onChange={(e) => setEmailsText(e.target.value)}
        />

        <div className="flex items-center gap-3">
          <label className="text-sm">Expires in (days)</label>
          <input
            type="number"
            className="border rounded px-2 py-1 w-24"
            min={1}
            max={60}
            value={expiresDays}
            onChange={(e) => setExpiresDays(parseInt(e.target.value || "14", 10))}
          />
          <button
            className="ml-auto px-4 py-2 rounded bg-black text-white disabled:opacity-50"
            disabled={loading || !emailsText.trim()}
          >
            {loading ? "Creating…" : "Create invites"}
          </button>
        </div>
      </form>

      {/* Results */}
      {summary && (
        <div className="border rounded p-3">
          <div className="font-semibold mb-2">Summary</div>
          <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">{JSON.stringify(summary, null, 2)}</pre>

          <div className="mt-3">
            <div className="font-semibold mb-1">Per-email results</div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Email</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Invite link</th>
                    <th className="px-3 py-2">Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="px-3 py-2">{r.email}</td>
                      <td className="px-3 py-2">{r.status}</td>
                      <td className="px-3 py-2">
                        {"url" in r ? (
                          <a className="text-blue-600 underline" href={r.url} target="_blank">
                            {r.url}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {"url" in r ? (
                          <button
                            className="border rounded px-2 py-1 text-xs"
                            onClick={() => navigator.clipboard.writeText(r.url)}
                          >
                            Copy
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                  {results.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                        No results yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pending invites list */}
      <div className="border rounded p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="font-semibold">Pending invites</div>
          <input
            className="ml-auto border rounded px-2 py-1 text-sm"
            placeholder="Filter…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Email</th>
                <th className="px-3 py-2 text-left">Created</th>
                <th className="px-3 py-2 text-left">Expires</th>
                <th className="px-3 py-2 text-left">Link</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvites.map((i) => (
                <tr key={i.id} className="border-t">
                  <td className="px-3 py-2">{i.is_public ? "(public)" : i.email || "—"}</td>
                  <td className="px-3 py-2">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{i.expires_at ? new Date(i.expires_at).toLocaleString() : "—"}</td>
                  <td className="px-3 py-2">
                    <a className="text-blue-600 underline" href={`/invite/${i.token}`} target="_blank">
                      /invite/{i.token}
                    </a>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button className="border rounded px-2 py-1 text-xs" onClick={() => revokeInvite(i.token)}>
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInvites.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-gray-500">
                    No pending invites.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
