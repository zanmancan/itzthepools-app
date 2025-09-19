// src/components/PendingInviteBanner.tsx
"use client";

import * as React from "react";

type Props = {
  /** Called after an invite is accepted so the parent can refresh */
  onAccepted?: () => void;
};

/**
 * Minimal banner that compiles and accepts an onAccepted callback.
 * Replace the body with your real pending-invite UI when ready.
 */
export default function PendingInviteBanner({ onAccepted }: Props) {
  const [sending, setSending] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  async function accept() {
    try {
      setSending(true);
      // TODO: call your real endpoint, e.g.:
      // await fetch("/api/invites/accept", { method: "POST", body: JSON.stringify({ token }) });
      onAccepted?.();
      setMsg("Invite accepted.");
    } finally {
      setSending(false);
    }
  }

  // If you don’t want any UI yet, you can `return null;`
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <div className="flex items-center justify-between gap-3">
        <span>You have a pending invite.</span>
        <button
          type="button"
          onClick={accept}
          disabled={sending}
          className="rounded bg-amber-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
        >
          {sending ? "Working…" : "Accept"}
        </button>
      </div>
      {msg && <p className="mt-1 text-xs opacity-80">{msg}</p>}
    </div>
  );
}
