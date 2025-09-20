// src/app/dashboard/page.tsx
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Dashboard</h1>
      <p className="opacity-80">
        Signed in as <span className="font-mono">{user.email}</span>.
      </p>
      <div className="mt-6 grid gap-4">{/* TODO: your widgets */}</div>
    </main>
  );
}
