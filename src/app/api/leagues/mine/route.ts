// src/app/api/leagues/mine/route.ts
import { NextResponse } from "next/server";
import { LEAGUES } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getViewerEmail(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

export async function GET(req: Request) {
  const email = getViewerEmail(req);
  if (!email) return NextResponse.json({ ok: true, leagues: [] });

  const leagues = Array.from(LEAGUES.values())
    .filter((l) => l.ownerEmail === email)
    .map((l) => ({ id: l.id, name: l.name }));

  return NextResponse.json({ ok: true, leagues });
}
