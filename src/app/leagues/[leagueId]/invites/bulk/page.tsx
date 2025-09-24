// src/app/leagues/[leagueId]/invites/bulk/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

function parseEmails(input: string): string[] {
  const raw = input
    .split(/[\n,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const set = new Set(raw.map((e) => e.toLowerCase()));
  return Array.from(set);
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!m) return null;
  const raw = m[1] ?? "";
  try {
    const v = decodeURIComponent(raw);
    return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
  } catch {
    return raw;
  }
}

export default function BulkInvitesPage({ params }: { params: { leagueId: string } }) {
  const { leagueId } = params;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [result, setResult] = useState<Array<{ email: string; token: string }>>([]);

  const safetyOn =
    process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" ||
    (process.env.NODE_ENV !== "production" && process.env.E2E_DEV_SAFETY === "1");

  // Dev safety: auto-login as admin so the API (admin-only) works locally/E2E
  useEffect(() => {
    (async () => {
      if (!safetyOn) return;
      const cookie = getCookie("tp_test_user");
      if (cookie === "admin@example.com") return;
      try {
        await fetch("/api/test/login-as", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "admin@example.com" }),
          credentials: "same-origin",
        });
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safetyOn]);

  async function onSubmit() {
    setToast(null);
    setResult([]);

    const emails = parseEmails(text);
    if (emails.length === 0) {
      setToast("Please enter one or more emails (comma, space, or newline separated).");
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/invites/bulk-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ leagueId, emails, expiresInMins: 60 }),
        credentials: "same-origin",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.ok !== true) {
        setToast(json?.message ?? `Bulk invite failed (HTTP ${res.status})`);
        setBusy(false);
        return;
      }
      setResult(json.invites as Array<{ email: string; token: string }>);
    } catch {
      setToast("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Bulk Invites</h1>
      <div className="text-sm text-gray-500">League ID: {leagueId}</div>

      <label className="block space-y-1">
        <span className="text-sm">Emails</span>
        <textarea
          data-testid="bulk-emails"
          className="w-full rounded border px-3 py-2 min-h-[140px]"
          placeholder="alice@example.com, bob@example.com&#10;charlie@example.com"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <p className="text-xs text-gray-500">
          Separate by comma, space or newline. Duplicates are ignored.
        </p>
      </label>

      <button
        data-testid="bulk-send"
        className="rounded px-4 py-2 border"
        onClick={() => void onSubmit()}
        disabled={busy || !text.trim()}
      >
        {busy ? "Sending…" : "Send invites"}
      </button>

      {toast && (
        <div
          data-testid="toast"
          role="status"
          className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {toast}
        </div>
      )}

      {result.length > 0 && (
        <div className="rounded border p-3">
          <div className="font-medium mb-2">Invites created ({result.length}):</div>
          <ul className="list-disc ml-6 space-y-1" data-testid="bulk-result">
            {result.map((r) => (
              <li key={r.token}>
                {r.email} &mdash; <code>{r.token}</code>
              </li>
            ))}
          </ul>
          <div className="mt-3 text-sm">
            <Link className="underline" href="/dashboard">
              Go to Dashboard
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
