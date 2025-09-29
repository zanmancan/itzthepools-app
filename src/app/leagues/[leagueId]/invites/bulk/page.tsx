/**
 * Server wrapper for Bulk Invites.
 * Delegates auth display to the Client (which calls /api/invites/context).
 */
import React from "react";
import Client from "./Client";

type Params = { params: { leagueId: string } };

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Page({ params }: Params) {
  const { leagueId } = params;
  return (
    <div className="p-4">
      <Client leagueId={leagueId} />
    </div>
  );
}
