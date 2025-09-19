// src/components/PendingInviteBanner.tsx
"use client";

import * as React from "react";

type PendingInviteBannerProps = {
  /** Called after an invite is accepted so the parent can refresh */
  onAccepted?: () => void;
};

/**
 * Minimal banner that compiles and accepts an onAccepted callback.
 * Replace the body with your real pending-invite UI when ready.
 */
export default function PendingInviteBanner({ onAccepted }: PendingInviteBannerProps) {
  // TODO: load pending invites and show UI.
  // When you actually accept an invite, call onAccepted?.()

  // For now, render nothing (keeps build green).
  return null;
}
