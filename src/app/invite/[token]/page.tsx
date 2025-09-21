"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { devlog } from "@/lib/devlog";

type Props = { params: { token: string } };

function validateTeamName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 2) return "Team name must be at least 2 characters.";
  if (trimmed.length > 30) return "Team name must be 30 characters or fewer.";
  if (!/^[A-Za-z0-9 _-]+$/.test(trimmed))
    return "Only letters, numbers, spaces, dashes and underscores are allowed.";
  return null;
}

export default function InvitePage({ params }: Props) {
  const token = params.token;
  const router = useRouter();
  const pathname = usePathname();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [teamName, setTeamName] = useState("");

  // NEW: token gate
  const [tokenStatus, setTokenStatus] = useState<
    "loading" | "ok" | "revoked" | "expired" | "used" | "invalid" | "error"
  >("loading");

  const teamError = useMemo(
    () => (authed ? validateTeamName(teamName) : null),
    [authed, teamName]
  );

  // Probe auth, cache team name
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/auth/whoami", { credentials: "same-origin" });
        if (res.ok) {
          const data = await res.json();
          setAuthed(true);
          setEmail(data?.email ?? null);
          const cached = localStorage.getItem(`invite-teamname:${token}`);
          if (cached) setTeamName(cached);
        } else {
          setAuthed(false);
        }
      } catch {
        setAuthed(false);
      }
    })();
  }, [token]);

  // NEW: preflight invite token status
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/invites/token/${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const json = await res.json().catch(() => ({}));
        devlog("[invite] token status", res.status, json);

        if (!mounted) return;

        if (res.ok && json?.ok) {
          setTokenStatus("ok");
          return;
        }

        const r = String(json?.reason || "");
        if (r === "revoked") return setTokenStatus("revoked");
        if (r === "expired") return setTokenStatus("expired");
        if (r === "used")    return setTokenStatus("used");

        // 404 or anything else
        setTokenStatus("invalid");
      } catch {
        if (mounted) setTokenStatus("error");
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  function onTeamChange(v: string) {
    setTeamName(v);
    try { localStorage.setItem(`invite-teamname:${token}`, v); } catch {}
  }

  async function acceptInvite() {
    setBusy(true);
    setError(null);
    setDetail(null);
    setOkMsg(null);

    try {
      if (tokenStatus !== "ok") {
        setError("This invite is not available.");
        setBusy(false);
        return;
      }

      if (!authed) {
        router.push(`/signup?next=${encodeURIComponent(pathname)}`);
        return;
      }
      if (teamError) {
        setError(teamError);
        setBusy(false);
        return;
      }

      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token, teamName }),
      });

      const data = await res.json().catch(() => ({} as any));
      devlog("[invite] accept response", res.status, data);

      if (res.status === 401 && String(data?.error || "").toLowerCase().includes("verify")) {
        const e = email ?? "";
        router.push(`/verify?email=${encodeURIComponent(e)}&next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!res.ok || data?.error) {
        setError(data?.error || "Failed to accept invite.");
        if (data?.detail) setDetail(String(data.detail));
        setBusy(false);
        return;
      }

      try { localStorage.removeItem(`invite-teamname:${token}`); } catch {}

      setOkMsg("Invite accepted! Redirecting to your dashboard…");
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
      setBusy(false);
    }
  }

  // helper for blocked states
  const BlockedCard = (title: string, body?: string) => (
    <div className="mt-6 text-red-400">
      <div className="font-semibold">{title}</div>
      {body && <div className="text-sm">{body}</div>}
    </div>
  );

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <div className="flex flex-wrap gap-3 mb-8">
        <Link href="/" className="px-4 py-2 rounded-full border">Home</Link>
        <Link href="/login" className="px-4 py-2 rounded-full border">Login (soon)</Link>
        <Link href="/dashboard" className="px-4 py-2 rounded-full border">Dashboard (soon)</Link>
      </div>

      <h1 className="text-4xl font-bold mb-6">League invite</h1>

      <div className="rounded-2xl border p-5 bg-black/20 mb-6">
        <div className="text-sm text-neutral-400 mb-1">Invite token</div>
        <div className="font-mono text-neutral-200 break-all">{token}</div>
      </div>

      {/* Blocked reasons */}
      {tokenStatus !== "ok" && tokenStatus !== "loading" && (
        <>
          {tokenStatus === "revoked" && BlockedCard("Invite was revoked", "Ask the league owner for a new link.")}
          {tokenStatus === "expired" && BlockedCard("Invite expired", "Ask the league owner to send a fresh invite.")}
          {tokenStatus === "used"    && BlockedCard("Invite already used", "The link was consumed or you’re already in.")}
          {tokenStatus === "invalid" && BlockedCard("Invalid invite", "This link is not valid.")}
          {tokenStatus === "error"   && BlockedCard("Could not verify this invite", "Please try again.")}
          <div className="mt-4">
            <Link href="/dashboard" className="underline">Go to dashboard</Link>
          </div>
          {/* Don’t render accept UI when blocked */}
          {error && (
            <div className="mt-6 text-red-400">
              <div className="font-semibold">Error</div>
              <div className="text-sm">{error}</div>
              {detail && <div className="text-xs mt-1 opacity-80">{detail}</div>}
            </div>
          )}
          {okMsg && (
            <div className="mt-6 text-green-400">
              <div className="font-semibold">Success</div>
              <div className="text-sm">{okMsg}</div>
            </div>
          )}
          {/* Early return UI */}
          <div className="mt-10" />
          {null}
        </>
      )}

      {/* Accept UI (only when token ok) */}
      {tokenStatus === "ok" && (
        <>
          {authed ? (
            <div className="mb-6">
              <label className="block text-sm text-neutral-300 mb-2" htmlFor="teamName">
                Team name <span className="text-red-400">*</span>
              </label>
              <input
                id="teamName"
                value={teamName}
                onChange={(e) => onTeamChange(e.target.value)}
                placeholder="e.g., Dunk Lords"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 outline-none focus:border-blue-500"
                autoComplete="off"
                maxLength={30}
              />
              <div className="mt-1 flex items-center justify-between text-xs text-neutral-400">
                <span>{teamName.trim().length}/30</span>
                {teamError && <span className="text-red-400">{teamError}</span>}
              </div>
            </div>
          ) : (
            <p className="mb-6 text-sm text-neutral-400">
              Sign up or sign in to continue. We’ll remember your team name.
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void acceptInvite()}
              disabled={busy || (authed ? !!teamError : false)}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg"
            >
              {busy ? "Accepting…" : "Accept invite"}
            </button>
            <Link href="/dashboard" className="border border-neutral-600 hover:bg-neutral-800 px-5 py-2 rounded-lg">
              Decline
            </Link>
          </div>

          {error && (
            <div className="mt-6 text-red-400">
              <div className="font-semibold">Error</div>
              <div className="text-sm">{error}</div>
              {detail && <div className="text-xs mt-1 opacity-80">{detail}</div>}
            </div>
          )}
          {okMsg && (
            <div className="mt-6 text-green-400">
              <div className="font-semibold">Success</div>
              <div className="text-sm">{okMsg}</div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
