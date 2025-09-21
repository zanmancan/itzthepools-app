// src/components/InviteForm.tsx
"use client";

import { useState } from "react";
import { siteOrigin } from "@/lib/siteOrigin";

type Props = { leagueId: string };

export default function InviteForm({ leagueId }: Props) {
  const [email, setEmail] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null);

  async function doCreate() {
    setBusy(true);
    setError(null);
    setAcceptUrl(null);

    try {
      const res = await fetch("/api/invites/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          league_id: leagueId,
          email: isPublic ? null : email || null,
          isPublic,
        }),
        cache: "no-store",
      });

      const raw = await res.text();
      let json: any = {};
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        json = { errorText: raw };
      }

      if (!res.ok) {
        const msg =
          json?.error ||
          json?.message ||
          json?.errorText ||
          `HTTP ${res.status} ${res.statusText || ""}`.trim();
        setError(msg);
        return;
      }

      const url = json?.acceptUrl || (json?.token ? `/invite/${json.token}` : null);
      if (!url) {
        setError("Invite created but no URL was returned.");
        return;
      }

      setAcceptUrl(url);
      if (!isPublic) setEmail("");
    } catch (err: any) {
      console.error("invite create failed:", err);
      setError(err?.message ?? "Network error");
    } finally {
      setBusy(false);
    }
  }

  function onCreate(e: React.FormEvent) {
    e.preventDefault();
    void doCreate();
  }

  async function doCopyLink() {
    if (!acceptUrl) return;
    try {
      const absolute = new URL(acceptUrl, siteOrigin()).toString();
      await navigator.clipboard.writeText(absolute);
      alert("Invite link copied to clipboard!");
    } catch {
      alert("Could not copy. Manually copy the URL shown.");
    }
  }

  const absolute = acceptUrl ? new URL(acceptUrl, siteOrigin()).toString() : null;

  return (
    <form onSubmit={onCreate} className="space-y-3">
      <div className="flex items-center gap-2">
        <input
          type="email"
          placeholder="invitee@email.com"
          className="flex-1 rounded border border-gray-700 bg-black px-3 py-2 text-sm disabled:opacity-50"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={busy || isPublic}
          required={!isPublic}
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create invite"}
        </button>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-300">
        <input
          type="checkbox"
          className="accent-blue-600"
          checked={isPublic}
          onChange={(e) => setIsPublic(e.target.checked)}
          disabled={busy}
        />
        Make this a public link (no email required)
      </label>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {absolute && (
        <div className="rounded border border-gray-700 p-3">
          <div className="text-xs text-gray-400">Invite link</div>
          <div className="break-all text-sm">{absolute}</div>
          <div className="mt-2 flex gap-2">
            <a
              className="rounded px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600"
              href={absolute}
              target="_blank"
            >
              Open
            </a>
            <button
              type="button"
              onClick={() => void doCopyLink()}
              className="rounded px-3 py-1 text-sm bg-gray-700 hover:bg-gray-600"
            >
              Copy link
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
