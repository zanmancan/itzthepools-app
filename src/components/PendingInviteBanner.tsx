// src/components/PendingInviteBanner.tsx
"use client";

import { useState } from "react";

type Props = {
  onAccepted?: () => void;
};

export default function PendingInviteBanner({ onAccepted }: Props) {
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    try {
      // If your accept endpoint needs a token, pass it here (query or JSON).
      await fetch("/api/invites/accept", { method: "POST" });
      onAccepted?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md bg-amber-50 p-3 text-amber-900">
      <div className="flex items-center justify-between gap-3">
        <span>You have a pending invite.</span>
        <button
          type="button"
          className="rounded bg-amber-900 px-3 py-1 text-amber-50 disabled:opacity-50"
          disabled={busy}
          onClick={() => void accept()}
        >
          {busy ? "Accepting…" : "Accept invite"}
        </button>
      </div>
    </div>
  );
}
