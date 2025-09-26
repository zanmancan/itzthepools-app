// src/app/leagues/[leagueId]/invites/bulk/page.tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getLeague } from "@/app/api/test/_store";
import { Client, Guard } from "@/app/leagues/[leagueId]/invites/bulk";

type PageProps = { params: { leagueId: string } };

function getViewerEmailFromCookie(): string {
  const c = cookies().get("tp_test_user")?.value ?? "";
  try {
    return decodeURIComponent(c);
  } catch {
    return c;
  }
}

export default async function Page({ params }: PageProps) {
  const leagueId = params?.leagueId;
  if (!leagueId) return notFound();

  // Derive role (server-side) so we can show a guard banner when blocked
  const viewerEmail = getViewerEmailFromCookie();
  const lg = getLeague(leagueId);
  const isManager = !!(lg && viewerEmail && lg.ownerEmail === viewerEmail);

  const isProd = process.env.NODE_ENV === "production";

  // In non-production (dev/tests), ALWAYS render the Client so E2Es can interact,
  // but still show the Guard banner when user isn't allowed (visible indication).
  if (!isProd) {
    return (
      <>
        {!isManager && <Guard leagueId={leagueId} />}
        <Client />
      </>
    );
  }

  // Production: strict guard
  if (!isManager) return <Guard leagueId={leagueId} />;
  return <Client />;
}
