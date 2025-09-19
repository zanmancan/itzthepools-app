import "./globals.css";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabaseServer";
import Nav from "@/components/Nav";
import ToastProvider from "@/components/Toast";

export const metadata: Metadata = {
  title: "Itz The Pools",
  description: "Multi-league, multi-sport pools"
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();

  return (
    <html lang="en">
      <body className="min-h-screen bg-black text-zinc-100">
        <div className="container mx-auto px-6">
          <Nav isAuthed={!!user} />
          <ToastProvider>
            {children}
          </ToastProvider>
        </div>
      </body>
    </html>
  );
}
