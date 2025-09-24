// src/components/DashboardInvitesPanel.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type InviteDTO = {
  token: string;
  email: string;
  leagueId: string;
  leagueName: string;
  expiresAt: number;
};

function getCookie(name: string): string | null {
  const cookie = typeof document !== "undefined" ? document.cookie : "";
  if (!cookie) return null;
  const m = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!m) return null;
  const raw = m[1] ?? "";
  try {
    const v = decodeURIComponent(raw);
    return v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
  } catch {
    return raw;
  }
}

export default function DashboardInvitesPanel() {
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<InviteDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  const viewer = useMemo<string>(() => getCookie("tp_test_user") ?? "", []);
  const isAdmin = viewer === "admin@example.com";

  const safetyOn =
    process.env.NEXT_PUBLIC_E2E_DEV_SAFETY === "1" ||
    (process.env.NODE_ENV !== "production" && process.env.E2E_DEV_SAFETY === "1");

  const fetchInvites = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/invites/list", {
        cache: "no-store",
        credentials: "same-origin",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j?.message ?? `HTTP ${res.status}`);
      setInvites(Array.isArray(j?.invites) ? (j.invites as InviteDTO[]) : []);
    } catch (e: unknown) {
      const msg = (e as { message?: string }).message ?? "Failed to load invites.";
      setInvites([]);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureCookieAndSeed = useCallback(async () => {
    // For dev/E2E: make sure we have some identity + at least one invite so the panel isn't empty
    if (safetyOn && !getCookie("tp_test_user")) {
      try {
        await fetch("/api/test/login-as", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "user@example.com" }),
          credentials: "same-origin",
        });
      } catch {}
    }

    await fetchInvites();

    if (safetyOn) {
      // If still empty, seed a single invite for visibility in local dev
      if (invites.length === 0) {
        try {
          await fetch("/api/test/seed-invite", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: "user@example.com" }),
            credentials: "same-origin",
          });
          await fetchInvites();
        } catch {}
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchInvites, safetyOn]);

  useEffect(() => {
    void ensureCookieAndSeed();
  }, [ensureCookieAndSeed]);

  async function onRevoke(token: string) {
    try {
      const res = await fetch("/api/invites/revoke", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        credentials: "same-origin",
      });
      if (!res.ok) {
        console.error("Revoke failed:", await res.text());
        return;
      }
      setInvites((prev) => prev.filter((x) => x.token !== token));
    } catch (e) {
      console.error("Revoke error:", e);
    }
  }

  if (loading) {
    return (
      <section data-testid="invites-panel" className="text-sm text-gray-600">
        Loading…
      </section>
    );
  }

  return (
    <section data-testid="invites-panel">
      {error && (
        <div className="mb-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {invites.length === 0 ? (
        <p className="text-sm text-gray-600">No open invites.</p>
      ) : (
        <ul className="divide-y border rounded">
          {invites.map((inv) => {
            const href = `/invite/${inv.token}`;
            const expires = new Date(inv.expiresAt).toLocaleString();
            return (
              <li
                key={inv.token}
                data-testid="invite-row"
                data-token={inv.token}
                className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="font-medium">{inv.leagueName}</div>
                  <div className="text-sm text-gray-600">
                    <span className="mr-2">Invitee: {inv.email}</span>
                    <span>Expires: {expires}</span>
                  </div>
                  <div className="text-sm">
                    <a className="underline" href={href}>
                      Open invite
                    </a>
                  </div>
                </div>

                {isAdmin ? (
                  <button
                    data-testid="revoke-invite"
                    className="px-3 py-1 rounded bg-red-600/90 hover:bg-red-600 text-white"
                    onClick={() => void onRevoke(inv.token)}
                  >
                    Revoke
                  </button>
                ) : (
                  <span className="text-xs text-gray-500">You cannot revoke</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
