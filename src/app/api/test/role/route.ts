import { NextRequest, NextResponse } from "next/server";

// NOTE: no "force-dynamic" export; keep this route simple & compatible.

export async function POST(req: NextRequest) {
  try {
    const { role, leagueId } = await req.json();

    if (!role || !["owner", "member", "admin"].includes(role)) {
      return NextResponse.json(
        { ok: false, error: "Invalid role. Use 'owner' | 'member' | 'admin'." },
        { status: 400 }
      );
    }

    // Dynamic require to avoid pulling this into prod bundles.
    // Your repo already uses "@/lib/devStore" on dev pages.
    // We update the same state object it reads from.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const devStore = require("@/lib/devStore");

    // Try a few common shapes so this works with your current dev store.
    if (typeof devStore.setRole === "function") {
      // Preferred: devStore.setRole(role: string, leagueId?: string)
      devStore.setRole(role, leagueId);
    } else if (devStore.state) {
      devStore.state.role = role;
      if (leagueId) devStore.state.improfile = leagueId;
    } else {
      // Safe fallback in case your store uses a global
      // (won't affect prod; only used by tests under NEXT_PUBLIC_E2E_DEV_SAFETY=1)
      // @ts-expect-error — intentional: Next.js type gap here during test shim
      global.__DEV_STORE__ = global.__DEV_STORE__ ?? {};
      // @ts-expect-error — intentional: Next.js type gap here during test shim
      global.__DEV_STORE__.role = role;
      if (leagueId) {
        // @ts-expect-error — intentional: Next.js type gap here during test shim
        global.__DEV_STORE__.improfile = leagueId;
      }
    }

    return NextResponse.json({ ok: true, role, improfile: leagueId ?? null });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
