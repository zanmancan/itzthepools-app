// src/app/join/public/page.tsx
import InviteFlowClient from "@/components/join/InviteFlowClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function JoinPublicPage({
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
        // InviteFlowClient now only needs the token (works for both public & email invites)
        <InviteFlowClient token={token} />
      )}
    </div>
  );
}
