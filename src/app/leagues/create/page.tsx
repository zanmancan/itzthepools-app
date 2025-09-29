"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateLeaguePage() {
  const [name, setName] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setToast(null);
    if (!name.trim()) {
      setToast("enter a league name");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/test/leagues/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setToast(String(json?.error || "create failed"));
        return;
      }
      router.push(`/leagues/${json.id}`);
    } catch (err: any) {
      setToast(err?.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-4 space-y-4">
      <h1 className="text-xl font-semibold">Create League</h1>
      {toast && (
        <div data-testid="toast" className="rounded border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200">
          {toast}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="League name"
          className="w-full rounded border border-neutral-700 bg-neutral-900 p-2"
        />
        <button disabled={busy} className="rounded border border-neutral-700 px-3 py-1.5 text-sm">
          {busy ? "Creating…" : "Create"}
        </button>
      </form>
    </div>
  );
}
