// src/app/api/leagues/create/route.ts
import { NextResponse } from "next/server";
import { LEAGUES, type League } from "@/app/api/test/_store";

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

function validateLeagueName(v?: unknown) {
  const s = String(v ?? "").trim();
  if (s.length < 3) return { ok: false as const, message: "League name must be at least 3 characters." };
  if (s.length > 40) return { ok: false as const, message: "League name must be 40 characters or fewer." };
  if (!/^[A-Za-z0-9 _-]+$/.test(s)) return { ok: false as const, message: "Only letters, numbers, spaces, dashes and underscores are allowed." };
  return { ok: true as const, value: s };
}

export async function POST(req: Request) {
  const email = getViewerEmail(req);
  if (!email) {
    return NextResponse.json(
      { ok: false, code: "UNAUTHENTICATED", message: "Sign in required." },
      { status: 401 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const name = validateLeagueName(body?.name);
  if (!name.ok) {
    return NextResponse.json({ ok: false, code: "BAD_NAME", message: name.message }, { status: 400 });
  }

  const id = `lg_${crypto.randomUUID().slice(0, 8)}`;
  const league: League = {
    id,
    name: name.value,
    teams: new Set(),
    ownerEmail: email, // ← now valid
  };
  LEAGUES.set(id, league);

  return NextResponse.json({ ok: true, leagueId: id, name: league.name });
}
