// src/app/dashboard/page.tsx
import MyLeaguesCard from "@/components/MyLeaguesCard";
import DashboardInvitesPanel from "@/components/DashboardInvitesPanel";

// Make sure this page always renders fresh data in dev/E2E
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: your leagues */}
      <MyLeaguesCard />

      {/* Right: pending invites panel (E2E looks for data-testid="invites-panel") */}
      <DashboardInvitesPanel />
    </div>
  );
}
