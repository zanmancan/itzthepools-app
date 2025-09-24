// src/app/dashboard/page.tsx
import Link from "next/link";
import MyLeaguesCard from "@/components/MyLeaguesCard";
import DashboardInvitesPanel from "@/components/DashboardInvitesPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Link
          href="/leagues/new"
          className="rounded-lg border px-3 py-1 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          data-testid="header-new-league"
        >
          New league
        </Link>
      </header>

      <section
        data-testid="pending-invite-banner"
        className="rounded-lg border p-4 bg-amber-50 dark:bg-amber-900/20"
      >
        <p className="text-sm">
          This dashboard shows your open invites and leagues for this session.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: invites (client-fetched) */}
        <DashboardInvitesPanel />

        {/* Right: My leagues */}
        <MyLeaguesCard />
      </div>
    </main>
  );
}
