import { NextResponse } from "next/server";

/**
 * GET /api/test/invites/list
 * Returns the current dev/e2e invite list from the in-memory store.
 * Only used in tests/dev mode (safe for prod).
 */
export async function GET() {
  // Dynamic require so this is never bundled into prod builds.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const devStore = require("@/lib/devStore");

  // Try common shapes so this works with your current store.
  const state =
    devStore.state ??
    devStore.getState?.() ??
    devStore.default?.state ??
    // last-resort global stash
    (global as any).__DEV_STORE__ ??
    ((global as any).__DEV_STORE__ = {});

  const invites: any[] =
    state.invites ?? state._invites ?? state.data?.invites ?? [];

  // Always return a copy; never leak the live array
  return NextResponse.json({
    ok: true,
    invites: invites.map((x: any) => ({ ...x })),
  });
}
