// src/app/invite/[token]/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

type Props = { params: { token: string } };

export default function InvitePage({ params }: Props) {
  const token = params.token;
  const router = useRouter();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function acceptInvite() {
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => ({} as any));

      if (res.status === 401 || data?.error === "Not authenticated.") {
        // Send them to signup and bounce back to this invite after
        router.push(`/signup?next=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!res.ok || data?.error) {
        setError(data?.error || "Failed to accept invite.");
        setBusy(false);
        return;
      }

      setOkMsg("Invite accepted! Redirecting to your dashboard…");
      setTimeout(() => router.push("/dashboard"), 600);
    } catch (e: any) {
      setError(e?.message || "Unexpected error.");
      setBusy(false);
    }
  }

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

      <p className="mb-6">Review the details and choose an option below.</p>

      <div className="flex gap-3">
        <button
          onClick={() => void acceptInvite()}
          disabled={busy}
          className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white px-5 py-2 rounded-lg"
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
        <Link
          href="/dashboard"
          className="border border-neutral-600 hover:bg-neutral-800 px-5 py-2 rounded-lg"
        >
          Decline
        </Link>
      </div>

      {error && (
        <div className="mt-6 text-red-400">
          <div className="font-semibold">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      )}

      {okMsg && (
        <div className="mt-6 text-green-400">
          <div className="font-semibold">Success</div>
          <div className="text-sm">{okMsg}</div>
        </div>
      )}
    </div>
  );
}
