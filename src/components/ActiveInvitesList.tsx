"use client";

import { useEffect, useMemo, useState } from "react";
import { useToast } from "./Toast"; // stays relative to this component folder
import { supabase } from "@/lib/supabaseClient";

type Invite = {
  id: string;
  token: string;
  email: string | null;
  note: string | null;
  use_count: number;
  max_uses: number | null;
  expires_at: string | null;
  revoked_at: string | null;
};

export default function ActiveInvitesList({ leagueId }: { leagueId: string }) {
  const { addToast } = useToast();
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  // inline create
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  // per-row “show link” toggles
  const [showLink, setShowLink] = useState<Record<string, boolean>>({});

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("invites")
      .select("id, token, email, note, use_count, max_uses, expires_at, revoked_at")
      .eq("league_id", leagueId)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      addToast(error.message, "error");
      setInvites([]);
    } else {
      setInvites(data ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    // mark as intentionally not awaited to satisfy no-floating-promises
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  async function createInvite() {
    setCreating(true);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          leagueId,
          email: email.trim() || undefined,
          note: note.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { id, joinUrl } = await res.json();

      await navigator.clipboard.writeText(joinUrl);
      addToast("Invite created and link copied!", "success");
      setEmail("");
      setNote("");
      await load();
      setOpen(true);
      setShowLink((m) => ({ ...m, [id]: false }));
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to create invite", "error");
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    try {
      const res = await fetch(`/api/invites/id/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      addToast("Invite revoked.", "success");
      await load();
    } catch (e: unknown) {
      addToast(e instanceof Error ? e.message : "Failed to revoke invite", "error");
    }
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      addToast("Link copied.", "success");
    } catch {
      addToast("Could not copy link", "error");
    }
  }

  function openLink(url: string) {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      addToast("Could not open link", "error");
    }
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  function fmtRelative(ts: string | null) {
    if (!ts) return "never";
    const target = new Date(ts).getTime();
    const now = Date.now();
    const diffMs = target - now;
    const abs = Math.abs(diffMs);
    const mins = Math.round(abs / 60000);
    const hours = Math.round(abs / 3600000);
    const days = Math.round(abs / 86400000);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

    if (mins < 60) return rtf.format(Math.sign(diffMs) * Math.max(1, Math.round(mins)), "minute");
    if (hours < 48) return rtf.format(Math.sign(diffMs) * Math.round(hours), "hour");
    return rtf.format(Math.sign(diffMs) * Math.round(days), "day");
  }

  const rows = useMemo(() => {
    return invites.map((i) => {
      const joinUrl = `${origin}/join/${i.token}`;
      const uses =
        i.max_uses === null || i.max_uses === 0 ? `${i.use_count}/∞` : `${i.use_count}/${i.max_uses}`;
      const expiresAbs = i.expires_at ? new Date(i.expires_at) : null;
      const expiresRel = fmtRelative(i.expires_at);
      const expiresFull = i.expires_at ? expiresAbs!.toLocaleString() : "never";
      return { ...i, joinUrl, uses, expiresRel, expiresFull };
    });
  }, [invites, origin]);

  return (
    <div className="mt-3">
      {/* Create row */}
      <div className="flex flex-col md:flex-row gap-2">
        <input
          className="input md:flex-1"
          placeholder="Email (optional)"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input md:flex-1"
          placeholder="Note (optional) e.g., work friends"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          className="btn"
          onClick={() => {
            void createInvite();
          }}
          disabled={creating}
        >
          {creating ? "Creating…" : "Create invite"}
        </button>
      </div>

      {/* Divider */}
      <div className="my-3 h-px bg-white/10" />

      {/* Header with chevron toggle */}
      <div className="flex items-center justify-between">
        <div className="font-medium">Active Invites</div>
        <button
          className="btn"
          onClick={() => setOpen((o) => !o)}
          title={open ? "Hide" : "Show"}
        >
          {open ? "▾ Hide" : "▸ Show"}
        </button>
      </div>

      {/* List */}
      {open && (
        <div className="mt-3">
          {loading ? (
            <div className="opacity-70">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="opacity-70">No active invites.</div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left opacity-70">
                    <tr>
                      <th className="py-2 pr-4">Email</th>
                      <th className="py-2 pr-4">Note</th>
                      <th className="py-2 pr-4">Uses</th>
                      <th className="py-2 pr-4">Expires</th>
                      <th className="py-2 pr-4">Link</th>
                      <th className="py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id} className="border-t border-white/10 align-top">
                        <td className="py-2 pr-4">{r.email ?? "—"}</td>
                        <td className="py-2 pr-4">{r.note ?? "—"}</td>
                        <td className="py-2 pr-4">{r.uses}</td>
                        <td className="py-2 pr-4">
                          <div>{r.expiresRel}</div>
                          <div className="opacity-60 text-xs">{r.expiresFull}</div>
                        </td>
                        <td className="py-2 pr-4">
                          {!showLink[r.id] ? (
                            <button
                              className="btn"
                              onClick={() => setShowLink((m) => ({ ...m, [r.id]: true }))}
                            >
                              Show link
                            </button>
                          ) : (
                            <div className="truncate max-w-[360px]">{r.joinUrl}</div>
                          )}
                        </td>
                        <td className="py-2">
                          <div className="flex gap-2">
                            <button
                              className="btn"
                              onClick={() => {
                                void copy(r.joinUrl);
                              }}
                            >
                              Copy
                            </button>
                            <button className="btn" onClick={() => openLink(r.joinUrl)}>
                              Open
                            </button>
                            <button
                              className="btn"
                              onClick={() => {
                                void revoke(r.id);
                              }}
                            >
                              Revoke
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden grid gap-2">
                {rows.map((r) => (
                  <div key={r.id} className="card">
                    <div className="grid gap-1 text-sm">
                      <div className="opacity-70 text-xs">Email</div>
                      <div className="mb-1">{r.email ?? "—"}</div>

                      <div className="opacity-70 text-xs">Note</div>
                      <div className="mb-1">{r.note ?? "—"}</div>

                      <div className="opacity-70 text-xs">Uses</div>
                      <div className="mb-1">{r.uses}</div>

                      <div className="opacity-70 text-xs">Expires</div>
                      <div className="mb-1">
                        {r.expiresRel} <span className="opacity-60">({r.expiresFull})</span>
                      </div>

                      <div className="opacity-70 text-xs">Link</div>
                      {!showLink[r.id] ? (
                        <button
                          className="btn mb-2"
                          onClick={() => setShowLink((m) => ({ ...m, [r.id]: true }))}
                        >
                          Show link
                        </button>
                      ) : (
                        <div className="mb-2 break-all">{r.joinUrl}</div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        className="btn"
                        onClick={() => {
                          void copy(r.joinUrl);
                        }}
                      >
                        Copy
                      </button>
                      <button className="btn" onClick={() => openLink(r.joinUrl)}>
                        Open
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          void revoke(r.id);
                        }}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
