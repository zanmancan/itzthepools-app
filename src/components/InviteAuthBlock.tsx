// src/components/InviteAuthBlock.tsx
"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Props = {
  token: string;
};

export default function InviteAuthBlock({ token }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const next = useMemo(() => pathname || `/invite/${token}`, [pathname, token]);

  const [teamName, setTeamName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, team_name: teamName || null }),
        cache: "no-store",
      });

      if (res.status === 401) {
        // Not signed in: push through signup and come back here
        router.push(`/signup?next=${encodeURIComponent(next)}`);
        return;
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      // Success → dashboard (your API already chooses the league; keeping as-is)
      router.replace("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Could not accept invite");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        Team name
        <input
          className="mt-1 w-full rounded border border-neutral-700 bg-black px-3 py-2"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value.slice(0, 30))}
          placeholder="Your team"
        />
      </label>

      <div className="flex items-center gap-2">
        <button
          onClick={() => void accept()}
          disabled={busy}
          className="rounded bg-blue-600 px-3 py-2 text-sm disabled:opacity-50"
        >
          {busy ? "Joining…" : "Accept invite"}
        </button>

        <button
          onClick={() => router.push(`/signup?next=${encodeURIComponent(next)}`)}
          className="rounded bg-gray-700 px-3 py-2 text-sm"
        >
          Create account
        </button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
