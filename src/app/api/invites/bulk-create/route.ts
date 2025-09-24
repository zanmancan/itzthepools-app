// src/app/api/invites/bulk-create/route.ts
import { NextResponse } from "next/server";
import { INVITES, LEAGUES } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getViewerEmail(req: Request): string {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

function validEmail(s: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
}

type BulkCreateBody = {
  leagueId?: unknown;
  emails?: unknown;
  expiresInMins?: unknown;
};

/**
 * POST /api/invites/bulk-create
 * Body: { leagueId: string, emails: string[], expiresInMins?: number }
 * Auth: admin@example.com only
 */
export async function POST(req: Request) {
  const caller = getViewerEmail(req);
  if (caller !== "admin@example.com") {
    return NextResponse.json(
      { ok: false, code: "FORBIDDEN", message: "Admin only." },
      { status: 403 }
    );
  }

  const raw: BulkCreateBody = await req.json().catch(() => ({} as BulkCreateBody));

  const leagueId: string = String(raw.leagueId ?? "").trim();
  const rawEmails: unknown[] = Array.isArray(raw.emails) ? (raw.emails as unknown[]) : [];
  const expiresInMinsNum =
    typeof raw.expiresInMins === "number" && raw.expiresInMins > 0
      ? raw.expiresInMins
      : 60;

  if (!leagueId || !LEAGUES.has(leagueId)) {
    return NextResponse.json(
      { ok: false, code: "BAD_LEAGUE", message: "League not found." },
      { status: 404 }
    );
  }
  const league = LEAGUES.get(leagueId)!;

  // Normalize, de-dupe, and strongly type as string[]
  const cleaned: string[] = Array.from(
    new Set(
      rawEmails
        .map((e: unknown) => String(e ?? "").trim().toLowerCase())
        .filter((s: string) => s.length > 0)
    )
  );

  const invalid: string[] = cleaned.filter((e: string) => !validEmail(e));
  if (invalid.length > 0) {
    return NextResponse.json(
      { ok: false, code: "BAD_EMAILS", message: `Invalid emails: ${invalid.join(", ")}` },
      { status: 400 }
    );
  }

  const created: Array<{ token: string; email: string }> = [];
  const expiresAt: number = Date.now() + expiresInMinsNum * 60_000;

  for (const email of cleaned) {
    const token = `tk_${crypto.randomUUID().slice(0, 12)}`;
    INVITES.set(token, {
      token,
      email,                   // string
      leagueId,                // string
      leagueName: league.name, // string
      expiresAt,               // number
      consumedAt: null,
    });
    created.push({ token, email });
  }

  return NextResponse.json({
    ok: true,
    leagueId,
    count: created.length,
    invites: created,
    expiresAt,
  });
}
