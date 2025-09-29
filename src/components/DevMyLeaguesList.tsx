/**
 * DevMyLeaguesList (server component)
 * Deterministic E2E list rendered synchronously on /dashboard.
 *
 * – Calls the API with an ABSOLUTE URL and forwards request cookies.
 * – If the API returns empty, it auto-seeds via /api/test/reset and retries.
 * – If no cookie is present, it injects tp_test_user=u_test for dev.
 *
 * Test IDs exposed:
 *  - my-leagues-card, my-leagues-list, my-leagues-item
 *  - invite-from-league
 *  - kebab-<id>-button, kebab-<id>-item-open, kebab-<id>-item-settings, kebab-<id>-item-invite
 */

import { cookies, headers } from "next/headers";

type LeagueItem = {
  id: string;
  name: string;
  season?: string | null;
  ruleset?: string | null;
  role?: "owner" | "admin" | "member";
  ownerEmail?: string | null;
};

export const dynamic = "force-dynamic";

function buildBase(): string {
  const h = headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3001";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

function cookieHeaderOrDefault(): string {
  const all = cookies().getAll();
  if (!all.length) return "tp_test_user=u_test";
  return all.map((c) => `${c.name}=${encodeURIComponent(c.value)}`).join("; ");
}

/** GET helper against our own API with absolute URL + cookie forwarding. */
async function apiGet<T = any>(path: string): Promise<{ ok: boolean; data?: T }> {
  const url = `${buildBase()}${path}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { cookie: cookieHeaderOrDefault() },
  }).catch(() => null);
  if (!res) return { ok: false };
  if (!res.ok) return { ok: false };
  const json = (await res.json().catch(() => ({}))) as any;
  return { ok: json?.ok !== false, data: json };
}

/** POST helper used for /api/test/reset retry */
async function apiPost(path: string, body: any): Promise<boolean> {
  const url = `${buildBase()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      cookie: cookieHeaderOrDefault(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body ?? {}),
  }).catch(() => null);
  if (!res || !res.ok) return false;
  const json = (await res.json().catch(() => ({}))) as any;
  return json?.ok === true;
}

async function fetchLeaguesSSR(): Promise<LeagueItem[]> {
  // 1) Try normally
  const first = await apiGet<{ ok: boolean; leagues?: LeagueItem[] }>("/api/test/leagues/mine");
  let leagues = Array.isArray(first.data?.leagues) ? (first.data!.leagues as LeagueItem[]) : [];

  // 2) If empty, auto-seed and retry once
  if (!leagues.length) {
    await apiPost("/api/test/reset", {});
    const retry = await apiGet<{ ok: boolean; leagues?: LeagueItem[] }>("/api/test/leagues/mine");
    leagues = Array.isArray(retry.data?.leagues) ? (retry.data!.leagues as LeagueItem[]) : [];
  }

  return leagues;
}

export default async function DevMyLeaguesList() {
  const leagues = await fetchLeaguesSSR();

  return (
    <div
      className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-4 shadow"
      data-testid="my-leagues-card"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">My Leagues (dev list)</h2>
      </div>

      {leagues.length === 0 && (
        <div className="text-sm text-neutral-400">No leagues yet.</div>
      )}

      <ul className="space-y-2" data-testid="my-leagues-list">
        {leagues.map((lg) => (
          <li
            key={lg.id}
            className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-800/30 p-3"
            data-testid="my-leagues-item"
          >
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{lg.name}</div>
              <div className="truncate text-xs text-neutral-400">
                {lg.season ?? "—"} {lg.role ? `• ${lg.role}` : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* The spec clicks this to open bulk invites */}
              <a
                href={`/leagues/${lg.id}/invites/bulk`}
                className="rounded-lg border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800"
                data-testid="invite-from-league"
                title="Invite"
              >
                Invite
              </a>

              {/* Always-visible kebab with stable IDs */}
              <div className="relative" data-testid={`kebab-${lg.id}`}>
                <button
                  type="button"
                  className="rounded-lg border border-neutral-700 px-2 py-1 text-xs"
                  data-testid={`kebab-${lg.id}-button`}
                  title="More"
                >
                  ⋮
                </button>
                <div
                  role="menu"
                  className="absolute right-0 z-10 mt-1 min-w-[160px] rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow-xl"
                >
                  <a
                    role="menuitem"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                    href={`/leagues/${lg.id}`}
                    data-testid={`kebab-${lg.id}-item-open`}
                  >
                    Open
                  </a>
                  <a
                    role="menuitem"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                    href={`/leagues/${lg.id}/settings`}
                    data-testid={`kebab-${lg.id}-item-settings`}
                  >
                    Settings
                  </a>
                  <a
                    role="menuitem"
                    className="block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-neutral-800"
                    href={`/leagues/${lg.id}/invites/bulk`}
                    data-testid={`kebab-${lg.id}-item-invite`}
                  >
                    Invite
                  </a>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
