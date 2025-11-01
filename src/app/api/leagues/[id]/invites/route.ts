import { NextResponse } from "next/server";
import { getStore, type Invite } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

export async function GET(_: Request, ctx: { params: { id: string } }) {
  const { id } = ctx.params;
  const store = getStore();
  const list: Invite[] = store.INVITES.filter(i => i.leagueId === id);

  // Backward-compat: also provide snake_case fields that some callers used.
  const items = list.map(i => ({
    ...i,
    used: (i as any).usedAt ? true : false,
    created_at: (i as any).createdAt ?? null,
    expires_at: (i as any).expiresAt ?? null,
  }));

  return NextResponse.json({ ok: true, leagueId: id, invites: list, items }, { status: 200 });
}
