// src/app/api/test/role/route.ts
import { NextResponse } from "next/server";
import { getLeague } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function getViewerEmail(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

/**
 * GET /api/test/role?leagueId=lg_...
 * -> { role: "owner" | "member" }
 */
export async function GET(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const url = new URL(req.url);
  const leagueId = String(url.searchParams.get("leagueId") || "").trim();
  if (!leagueId) return NextResponse.json({ role: "member" as const });

  const email = getViewerEmail(req);
  const lg = getLeague(leagueId);
  const role: "owner" | "member" =
    lg && email && lg.ownerEmail === email ? "owner" : "member";

  return NextResponse.json({ role });
}
