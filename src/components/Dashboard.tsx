// src/components/Dashboard.tsx
"use client";

import PendingInviteBanner from "./PendingInviteBanner";
import ProfileCard from "./ProfileCard";
import ActiveInvitesCard from "./ActiveInvitesCard";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <PendingInviteBanner />
      <ProfileCard />
      <ActiveInvitesCard />
    </div>
  );
}
