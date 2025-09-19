"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = { isAuthed: boolean };

export default function Nav({ isAuthed }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function logout() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/auth/signout", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      // Hard refresh to clear any client state
      location.href = "/";
    } catch (e: any) {
      setErr(e?.message ?? "Failed to sign out");
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 py-4">
      <Link href="/" className="btn">Home</Link>
      <Link href="/login" className="btn">Login (soon)</Link>
      <Link href="/dashboard" className="btn">Dashboard (soon)</Link>

      <div className="grow" />
      {isAuthed ? (
        <button className="btn" onClick={logout} disabled={busy}>
          {busy ? "Signing out..." : "Logout"}
        </button>
      ) : null}

      {err && <span className="ml-3 text-red-400 text-sm">{err}</span>}
    </div>
  );
}
