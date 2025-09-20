// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import Nav from "@/components/Nav";
import ToastProvider from "@/components/Toast";
import AuthSync from "@/components/AuthSync"; // keeps Supabase cookies in sync client↔server

export const metadata: Metadata = {
  title: "Itz The Pools",
  description: "Multi-league, multi-sport pools platform",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side check for an authenticated user (safe to call in a layout)
  const sb = supabaseServer();
  const {
    data: { user },
  } = await sb.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {/* Client hook that syncs Supabase auth events to HttpOnly cookies */}
        <AuthSync />

        {/* Skip link for a11y */}
        <a
          href="#app-main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md focus:bg-neutral-800 focus:px-3 focus:py-2"
        >
          Skip to content
        </a>

        {/* Site chrome */}
        <div className="container">
          <Nav isAuthed={!!user} />

          {/* Main app content */}
          <main id="app-main" role="main" className="mt-6" data-testid="app-main">
            <ToastProvider>{children}</ToastProvider>
          </main>
        </div>
      </body>
    </html>
  );
}
