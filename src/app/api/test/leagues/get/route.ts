import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";
import { persistGetLeague } from "@/app/api/test/_persist";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") || "";

  // Prefer persisted (works across workers)
  const p = persistGetLeague(id);
  if (p) return NextResponse.json({ ok: true, league: p });

  // Fall back to in-memory (same worker)
  const store = getStore();
  const lg = store.leagues[id];
  if (lg) return NextResponse.json({ ok: true, league: { id: lg.id, name: lg.name } });

  return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
}
