// src/app/page.tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Itz The Pools",
  description: "Multi-league, multi-sport pools platform.",
};

export default function HomePage() {
  return (
    <main
      className="mx-auto w-full max-w-3xl px-6 py-10"
      data-testid="home-hero"
    >
      <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-neutral-100">Itz The Pools</h1>
        <p className="mt-2 text-sm text-neutral-400">
          Multi-league, multi-sport pools platform. This shell was created in <b>Step 1.4</b>.
        </p>

        <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-300">
          <li>Next.js App Router + Tailwind</li>
          <li>Reusable UI utilities</li>
          <li>Supabase/Auth comes in Step 1.5</li>
        </ul>

        <div className="mt-6 flex gap-3">
          <Link
            href="/dashboard"
            className="rounded-md border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-700"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/auth/login"
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
