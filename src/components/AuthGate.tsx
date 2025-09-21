// src/components/AuthGate.tsx
// Server Component auth wrapper that DOES NOT auto-redirect.
// If user is not signed in, it shows a friendly sign-in prompt instead.
// This prevents Dashboard from bouncing to /login when cookies aren't read yet.

import Link from "next/link";
import { createSbServer } from "@/lib/supabaseServer";

type Props = {
  children: React.ReactNode;
  requireAuth?: boolean; // if false, always render children
  title?: string;
  note?: string;
};

export default async function AuthGate({
  children,
  requireAuth = true,
  title = "Please sign in",
  note = "You need to be signed in to view this page.",
}: Props) {
  // server-side supabase client with read-only cookies
  const sb = createSbServer();

  const {
    data: { user },
    error,
  } = await sb.auth.getUser();

  // If auth is not required, just render children—useful for mixed pages
  if (!requireAuth) return <>{children}</>;

  // If no user, render a soft gate instead of redirecting
  if (error || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-2xl flex-col items-center justify-center px-6 text-center">
        <h1 className="mb-2 text-2xl font-semibold">{title}</h1>
        <p className="mb-6 text-sm text-gray-400">{note}</p>
        <div className="flex gap-3">
          <Link
            href="/login"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Go to Login
          </Link>
          <Link
            href="/"
            className="rounded-md border border-gray-700 px-4 py-2 text-sm text-gray-200 hover:bg-gray-800/50"
          >
            Home
          </Link>
        </div>
      </div>
    );
  }

  // Auth OK -> render protected content
  return <>{children}</>;
}
