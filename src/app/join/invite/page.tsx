// src/app/join/invite/page.tsx
import InviteFlowClient from "../../../components/join/InviteFlowClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function JoinInvitePage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = (searchParams?.token || "").trim();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">Join League</h1>

      {!token ? (
        <div className="rounded-md border border-red-800 bg-red-900/30 px-3 py-2 text-sm text-red-300">
          Missing token. Check your link or ask for a new invite.
        </div>
      ) : (
        // Always render the client flow; it handles sign-in/create/verify/finalize
        <InviteFlowClient token={token} variant="invite" />
      )}
    </div>
  );
}
