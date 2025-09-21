// src/app/admin/email-events/page.tsx
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventRow = {
  id: string | number;
  created_at: string | null;
  // handle either new or legacy column names
  event_type?: string | null;
  type?: string | null;
  recipient?: string | null;
  to_email?: string | null;
  message_id?: string | null;
  msg_id?: string | null;
  provider?: string | null;
  payload?: any;
  raw?: any;
};

export default async function EmailEventsAdminPage() {
  const sb = supabaseServer();

  // Require auth (you already added a SELECT policy; this keeps UI sane)
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Email Events</h1>
        <p className="text-red-600">Please sign in.</p>
      </main>
    );
  }

  // Pull latest 100 events directly from DB
  const { data, error } = await sb
    .from("email_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  const events = (data ?? []) as EventRow[];

  if (error) {
    return (
      <main className="max-w-5xl mx-auto p-6">
        <h1 className="text-2xl font-semibold mb-3">Email Events</h1>
        <p className="text-red-600">Failed to load events.</p>
        <pre className="mt-3 text-xs bg-black/30 p-3 rounded">{error.message}</pre>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Email Events</h1>
        <p className="text-sm text-gray-500">Recent events from the Resend webhook sink.</p>
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
              const type = e.event_type ?? e.type ?? "—";
              const recipient = e.recipient ?? e.to_email ?? "—";
              const msgId = e.message_id ?? e.msg_id ?? "—";
              const provider = e.provider ?? "resend";
              return (
                <tr key={String(e.id)} className="border-t">
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
