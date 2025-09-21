// src/app/join/invite/page.tsx
import Link from "next/link";
import { createSbServer } from "@/lib/supabaseServer";
// NOTE: use a RELATIVE import so it always resolves, even if alias config is quirky
import AcceptInviteClient from "../../../components/join/AcceptInviteClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-8 w-full max-w-xl rounded-xl border border-gray-800 bg-gray-950/40 p-5">
      {children}
    </div>
  );
}

export default async function JoinInvitePage({
  searchParams,
}: {
  searchParams?: { token?: string };
}) {
  const token = (searchParams?.token || "").trim();
  const sb = createSbServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-semibold">Join League</h1>

      <Card>
        {!token ? (
          <p className="text-red-300">Missing invite token. Check your link or ask for a new invite.</p>
        ) : !user ? (
          <div>
            <p className="mb-4 text-gray-300">You need to sign in before accepting this invite.</p>
            <div className="flex gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/join/invite?token=${encodeURIComponent(token)}`)}`}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-500"
              >
                Sign in to continue
              </Link>
              <Link
                href="/"
                className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/50"
              >
                Home
              </Link>
            </div>
          </div>
        ) : (
          <AcceptInviteClient token={token} />
        )}
      </Card>
    </div>
  );
}
