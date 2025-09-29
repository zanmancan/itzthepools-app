import { headers } from "next/headers";
import AcceptClient from "./parts/AcceptClient";

export const dynamic = "force-dynamic";

function base(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function getInvite(token: string) {
  const res = await fetch(`${base()}/api/test/invites/get?token=${encodeURIComponent(token)}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json().catch(() => ({}));
  return j?.invite ?? null;
}

export default async function InvitePage({ params }: { params: { token: string } }) {
  const invite = await getInvite(params.token);

  if (!invite) {
    return (
      <main className="mx-auto max-w-xl p-4">
        <div role="alert" className="rounded-md border border-red-700 bg-red-950/60 px-3 py-2 text-sm text-red-200" data-testid="toast">
          Invite not found or expired
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl p-4" data-testid="pending-invite-banner">
      <h1 className="mb-3 text-2xl font-semibold">You&apos;re invited</h1>
      <div className="mb-3">
        League: <span data-testid="invite-league-name" className="font-medium">{invite.leagueName ?? "League"}</span>
      </div>

      <AcceptClient token={invite.token} />
    </main>
  );
}
