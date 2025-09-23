// src/app/dashboard/page.tsx
"use client";

/**
 * Minimal stub so E2E can assert invites panel + revoke button.
 * For now, always shows Revoke (we’re not testing admin UI logic yet).
 * Server-side routes will still block non-admin actions once we wire them.
 */
export default function Dashboard() {
  return (
    <main className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section data-testid="invites-panel" className="border rounded p-4 space-y-3">
        <h2 className="font-medium">Pending Invites</h2>
        <div data-testid="invite-row" className="flex items-center justify-between">
          <div>user@example.com → Test League</div>
          <button data-testid="revoke-invite" className="border rounded px-3 py-1">
            Revoke
          </button>
        </div>
      </section>
    </main>
  );
}
