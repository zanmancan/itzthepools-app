// src/app/admin/email-events/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Minimal admin view for recent email events.
 * - Requires auth. You may want to restrict further (e.g., owner, is_admin flag, email domain, etc).
 * - Reads via API to keep server/DB policies in one place.
 */
export default async function Page() {
  const sb = supabaseServer();

  // Require auth
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Email Events</h1>
        <p className="text-red-600">Please sign in.</p>
      </main>
    );
  }

  // (Optional) Additional gating:
  // const { data: profile } = await sb.from("profiles").select("is_admin").eq("id", auth.user.id).maybeSingle();
  // if (!profile?.is_admin) return <main className="p-6">Forbidden</main>;

  // Fetch from our API so we reuse policy logic
  const resp = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || ""}/api/admin/email-events?limit=100`, {
    // Avoid caching – this is a live log
    cache: "no-store",
  }).catch(() => null);

  const data = await resp?.json().catch(() => null);
  const events: any[] = data?.events || [];

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Events</h1>
        <p className="text-sm text-gray-500">
          Recent events from your webhook sink (Resend). Showing latest {events.length}.
        </p>
      </div>

      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Recipient</th>
              <th className="px-3 py-2 text-left">Message ID</th>
              <th className="px-3 py-2 text-left">Provider</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const created = e.created_at ? new Date(e.created_at).toLocaleString() : "—";
              const type = e.event_type || e.type || "—";
              const recipient = e.recipient || e.to_email || "—";
              const msgId = e.message_id || e.msg_id || "—";
              const provider = e.provider || "resend";
              return (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{created}</td>
                  <td className="px-3 py-2">{type}</td>
                  <td className="px-3 py-2">{recipient}</td>
                  <td className="px-3 py-2">{msgId}</td>
                  <td className="px-3 py-2">{provider}</td>
                </tr>
              );
            })}
            {events.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-gray-500">
                  No events yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
