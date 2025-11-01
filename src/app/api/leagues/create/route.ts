import { NextRequest, NextResponse } from "next/server";
import { getStore, type League } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim() || "My League";
    const ownerId = String(body.ownerId ?? "owner_1");

    const store = getStore();
    const id = (body.id && String(body.id)) || `lg_${Math.random().toString(36).slice(2, 8)}`;

    const league: League = {
      id,
      name,
      ownerId,
      members: { [ownerId]: "owner" },
    };

    store.upsertLeague(league);

    // keep response friendly; but do NOT add unknown props onto the League object
    return NextResponse.json({ ok: true, league }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
