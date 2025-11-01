import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime  = "nodejs" as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = String(url.searchParams.get("id") ?? "").trim();
  if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });

  const store = getStore();
  const lg = store.getLeague(id);
  if (!lg) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, league: lg }, { status: 200 });
}
