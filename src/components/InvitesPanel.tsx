// src/components/InvitesPanel.tsx
"use client";

/**
 * InvitesPanel
 * - Fetches invites for a given league and buckets them into:
 *   open, accepted, denied (revoked or expired)
 * - Renders three collapsible sections with counts.
 * - Strong error handling: UI never explodes if API changes or fails.
 */

import { useEffect, useMemo, useState } from "react";

export type InviteRow = {
  id: string;
  token: string;
  email: string | null;
  isPublic?: boolean | null; // tolerate either isPublic or is_public from API
  is_public?: boolean | null;
  created_at: string | null;
  expires_at: string | null;
  accepted_at?: string | null;
  accepted?: boolean | null;
  revoked_at: string | null;
};

type ApiResponse =
  | {
      ok: true;
      open: InviteRow[];
      accepted: InviteRow[];
      denied: InviteRow[];
    }
  | {
      ok?: false;
      error?: string;
      open?: InviteRow[];
      accepted?: InviteRow[];
      denied?: InviteRow[];
    };

type Props = { leagueId: string };

export default function InvitesPanel({ leagueId }: Props) {
  const [data, setData] = useState<{ open: InviteRow[]; accepted: InviteRow[]; denied: InviteRow[] }>({
    open: [],
    accepted: [],
    denied: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchInvites() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leagues/${leagueId}/invites`, {
        cache: "no-store",
      });

      // Try to parse JSON; if it fails, treat as empty arrays
      let body: ApiResponse | null = null;
      try {
        body = (await res.json()) as ApiResponse;
      } catch {
        body = null;
      }

      if (!res.ok) {
        const msg = (body && "error" in body && body?.error) || `HTTP ${res.status}`;
        setError(`Failed to load invites: ${msg}`);
        setData({ open: [], accepted: [], denied: [] });
        return;
      }

      // Normalize buckets and always return arrays
      const open = Array.isArray(body?.open) ? body!.open : [];
      const accepted = Array.isArray(body?.accepted) ? body!.accepted : [];
      // Server might call this "revoked" historically — accept both
      const deniedFallback: InviteRow[] =
        Array.isArray((body as any)?.denied)
          ? (body as any).denied
          : Array.isArray((body as any)?.revoked)
          ? (body as any).revoked
          : [];

      setData({ open, accepted, denied: deniedFallback });
    } catch (e: any) {
      setError(`Unexpected error: ${e?.message || String(e)}`);
      setData({ open: [], accepted: [], denied: [] });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchInvites();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueId]);

  const counters = useMemo(
    () => ({
      open: data.open?.length ?? 0,
      accepted: data.accepted?.length ?? 0,
      denied: data.denied?.length ?? 0,
    }),
    [data]
  );

  return (
    <div className="rounded-lg border border-gray-700 bg-black/20 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Invites</h3>
        <ReloadButton onClick={() => void fetchInvites()} busy={loading} />
      </div>

      {error && <ErrorBox message={error} />}

      <Section title={`Open (${counters.open})`} defaultOpen>
        <Table rows={data.open} empty="No open invites." />
      </Section>

      <Section title={`Accepted (${counters.accepted})`}>
        <Table rows={data.accepted} empty="No accepted invites yet." />
      </Section>

      <Section title={`Denied / Expired (${counters.denied})`}>
        <Table rows={data.denied} empty="No denied/expired invites." />
      </Section>
    </div>
  );
}

/** Collapsible section built on <details> for simplicity and reliability */
function Section({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="mb-3 rounded border border-gray-800 bg-gray-950/40" open={defaultOpen}>
      <summary className="cursor-pointer select-none px-3 py-2 font-medium text-gray-200 hover:bg-gray-900/60">
        {title}
      </summary>
      <div className="px-3 pb-3 pt-2">{children}</div>
    </details>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-md border border-red-700 bg-red-950/40 p-3 text-sm text-red-200">
      <div className="font-semibold">There was a problem loading invites.</div>
      <div className="mt-1 leading-snug">{message}</div>
    </div>
  );
}

function ReloadButton({ onClick, busy }: { onClick: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="rounded bg-gray-800 px-3 py-1 text-sm text-gray-100 hover:bg-gray-700 disabled:opacity-50"
      title="Reload"
    >
      {busy ? "Loading…" : "Reload"}
    </button>
  );
}

function Table({ rows, empty }: { rows: InviteRow[]; empty: string }) {
  if (!rows || rows.length === 0) {
    return <div className="text-sm text-gray-400">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-gray-800 text-gray-300">
          <tr>
            <th className="py-1 pr-3">When</th>
            <th className="py-1 pr-3">Email</th>
            <th className="py-1 pr-3">Expires</th>
            <th className="py-1 pr-3">Type</th>
            <th className="py-1 pr-3">Link</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const pub = (r.isPublic ?? r.is_public) ? true : false;
            const inviteUrl = `/invite/${r.token}`;
            return (
              <tr key={r.id} className="border-b border-gray-900/40">
                <td className="py-1 pr-3 text-gray-300">{fmtDateTime(r.created_at)}</td>
                <td className="py-1 pr-3">{pub ? <span className="text-gray-400">—</span> : r.email}</td>
                <td className="py-1 pr-3">{fmtDateTime(r.expires_at) || <span className="text-gray-400">—</span>}</td>
                <td className="py-1 pr-3">{pub ? "Public Link" : "Email Invite"}</td>
                <td className="py-1 pr-3">
                  <CopyButton text={inviteUrl} label="Copy" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  async function doCopy() {
    try {
      const value = text.startsWith("http") ? text : `${location.origin}${text}`;
      await navigator.clipboard.writeText(value);
      // eslint-disable-next-line no-alert
      alert("Invite link copied to clipboard.");
    } catch (e: any) {
      // eslint-disable-next-line no-alert
      alert(`Copy failed: ${e?.message || String(e)}`);
    }
  }
  return (
    <button
      type="button"
      onClick={() => void doCopy()}
      className="rounded bg-gray-800 px-2 py-0.5 text-xs hover:bg-gray-700"
    >
      {label}
    </button>
  );
}

function fmtDateTime(v: string | null): string {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(+d)) return v;
    // show local date & short time
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return v;
  }
}
