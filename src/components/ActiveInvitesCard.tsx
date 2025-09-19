// src/components/ActiveInvitesCard.tsx
"use client";

import ActiveInvitesList from "./ActiveInvitesList";

export default function ActiveInvitesCard() {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-4">
      <h3 className="mb-3 text-lg font-semibold">Pending invites</h3>
      <ActiveInvitesList />
    </section>
  );
}
