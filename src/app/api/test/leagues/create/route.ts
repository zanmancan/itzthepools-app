// src/app/api/test/leagues/create/route.ts
import { NextResponse } from "next/server";
import { upsertLeague } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function makeId(seed?: string) {
  if (seed) return seed;
  const n = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `lg_${n}_${r}`;
}

/**
 * POST /api/test/leagues/create
 * body: { id?, name?, ownerEmail }
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const ownerEmail = String(body?.ownerEmail || "").trim();
  if (!ownerEmail) return new NextResponse("ownerEmail required", { status: 400 });

  const id = makeId(body?.id);
  const name = String(body?.name || `League ${id}`).trim();

  upsertLeague({ id, name, ownerEmail });
  return NextResponse.json({ ok: true, league: { id, name, ownerEmail } });
}
