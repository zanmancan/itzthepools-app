// src/app/league/[leagueId]/invites/bulk/page.tsx
import nextDynamic from "next/dynamic";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Load the client component with no SSR to avoid page-prop type confusion
const BulkInvitesClient = nextDynamic(() => import("./BulkInvitesClient"), { ssr: false });

export default async function Page({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();

  // Require auth
  const { data: auth } = await sb.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Bulk Invites</h1>
        <p className="text-red-600">Please sign in.</p>
      </main>
    );
  }

  // Owner-only check
  const { data: league, error } = await sb
    .from("leagues")
    .select("id, owner_id, name")
    .eq("id", params.leagueId)
    .maybeSingle();

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Bulk Invites</h1>
        <p className="text-red-600">Failed to load league: {error.message}</p>
      </main>
    );
  }

  if (!league || league.owner_id !== userId) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">Bulk Invites</h1>
        <p className="text-red-600">Forbidden (owner only).</p>
      </main>
    );
  }

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Bulk Invites</h1>
        <p className="text-sm text-gray-500">League: {league.name || league.id}</p>
      </div>

      <BulkInvitesClient leagueId={league.id} />
    </main>
  );
}
