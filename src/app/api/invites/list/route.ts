// src/app/api/invites/list/route.ts
import { NextResponse } from "next/server";
import { INVITES } from "@/app/api/test/_store";

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

type InviteDTO = {
  token: string;
  email: string;
  leagueId: string;
  leagueName: string;
  expiresAt: number;
  consumedAt?: number | null;
};

export async function GET(req: Request) {
  const viewer = getViewerEmail(req);
  const now = Date.now();

  // Convert map -> array and filter out expired/consumed
  const allOpen: InviteDTO[] = Array.from(INVITES.values())
    .filter((inv) => !inv.consumedAt && inv.expiresAt > now)
    .map((inv) => ({
      token: inv.token,
      email: inv.email,
      leagueId: inv.leagueId,
      leagueName: inv.leagueName,
      expiresAt: inv.expiresAt,
      consumedAt: inv.consumedAt ?? null,
    }));

  // Admin sees ALL open invites; others see only their own
  const invites =
    viewer === "admin@example.com"
      ? allOpen
      : allOpen.filter((i) => i.email.toLowerCase() === viewer.toLowerCase());

  // Sort newest-first by expiration just for stable output
  invites.sort((a, b) => b.expiresAt - a.expiresAt);

  return NextResponse.json({ ok: true, invites });
}
