// src/app/league/[leagueId]/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";
import Link from "next/link";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * League page
 * - Requires auth
 * - Loads league by id
 * - Shows "Bulk invites" link only to the owner
 */
export default async function Page({ params }: { params: { leagueId: string } }) {
  const sb = supabaseServer();

  // Require auth
  const { data: auth } = await sb.auth.getUser();
  const userId = auth?.user?.id ?? null;
  if (!userId) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">League</h1>
        <p className="text-red-600">Please sign in.</p>
      </main>
    );
  }

  // Load league
  const { data: league, error } = await sb
    .from("leagues")
    .select("id, name, owner_id")
    .eq("id", params.leagueId)
    .maybeSingle();

  if (error) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">League</h1>
        <p className="text-red-600">Failed to load league: {error.message}</p>
      </main>
    );
  }

  if (!league) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-2">League</h1>
        <p className="text-red-600">League not found.</p>
      </main>
    );
  }

  const isOwner = league.owner_id === userId;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{league.name || league.id}</h1>
        <p className="text-sm text-gray-500">League ID: {league.id}</p>
      </div>

      {isOwner ? (
        <div className="flex items-center gap-3">
          <Link
            href={`/league/${league.id}/invites/bulk`}
            className="inline-block px-4 py-2 rounded bg-black text-white"
          >
            Bulk Invites
          </Link>
        </div>
      ) : (
        <p className="text-gray-600 text-sm">You are a member. Only the owner can manage invites.</p>
      )}

      {/* Add owner/member dashboards here as needed */}
    </main>
  );
}
