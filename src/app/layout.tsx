// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ToastProvider from "@/components/Toast";
import { supabaseServer } from "@/lib/supabaseServer";

export const metadata: Metadata = {
  title: "Itz The Pools",
  description: "Multi-league, multi-sport pools platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Soft, defensive auth check — NEVER throw here.
  let isAuthed = false;
  try {
    const sb = supabaseServer();
    const { data, error } = await sb.auth.getUser();
    if (!error && data?.user) isAuthed = true;
  } catch {
    // swallow — we never want layout to crash production
    isAuthed = false;
  }

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {/* Skip link for a11y */}
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-neutral-800 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        <div className="container">
          <Nav isAuthed={isAuthed} />
          <main id="app-main" role="main" className="mt-6" data-testid="app-main">
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </body>
    </html>
  );
}
