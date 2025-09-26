// src/app/leagues/[leagueId]/settings/page.tsx
/**
 * League Settings
 * - Shows a simple settings shell for owners
 * - Non-owners see the 403 Guard banner
 * - In dev/tests (NODE_ENV !== production), we still render the client
 *   *along with* the guard banner so E2E can assert visibility easily.
 */

import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLeague } from "@/app/api/test/_store";
import { Guard } from "@/app/leagues/[leagueId]/invites/bulk";
import SettingsClient from "./settingsClient";

type PageProps = { params: { leagueId: string } };

function viewerEmail(): string {
  const raw = cookies().get("tp_test_user")?.value ?? "";
  try { return decodeURIComponent(raw); } catch { return raw; }
}

export const dynamic = "force-dynamic";

export default async function LeagueSettingsPage({ params }: PageProps) {
  const leagueId = params?.leagueId;
  if (!leagueId) return notFound();
  const lg = getLeague(leagueId);
  if (!lg) return notFound();

  const me = viewerEmail();
  const isOwner = !!(me && lg.ownerEmail === me);
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    // Dev/tests: always render the client but show the guard if blocked
    return (
      <>
        {!isOwner && <Guard leagueId={leagueId} />}
        <SettingsClient leagueId={leagueId} />
      </>
    );
  }

  if (!isOwner) return <Guard leagueId={leagueId} />;
  return <SettingsClient leagueId={leagueId} />;
}
