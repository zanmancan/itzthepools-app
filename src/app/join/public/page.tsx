// src/app/join/public/page.tsx
import Link from "next/link";
import { createSbServer } from "@/lib/supabaseServer";
// RELATIVE import to avoid alias issues
import AcceptPublicInviteClient from "../../../components/join/AcceptPublicInviteClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-8 w-full max-w-xl rounded-xl border border-gray-800 bg-gray-950/40 p-5">
      {children}
    </div>
  );
}

export default async function JoinPublicPage({
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
      <h1 className="text-2xl font-semibold">Join League (Public Link)</h1>

      <Card>
        {!token ? (
          <p className="text-red-300">Missing token. Check your link or ask for a new public link.</p>
        ) : !user ? (
          <div>
            <p className="mb-4 text-gray-300">Sign in to accept this public link invite.</p>
            <div className="flex gap-3">
              <Link
                href={`/login?next=${encodeURIComponent(`/join/public?token=${encodeURIComponent(token)}`)}`}
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
          <AcceptPublicInviteClient token={token} />
        )}
      </Card>
    </div>
  );
}
