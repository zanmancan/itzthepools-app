// src/app/api/invites/revoke/route.ts
/**
 * Admin-only revoke. Deletes an invite from the store.
 * Body: { token: string }
 */
import { NextResponse } from "next/server";
import { INVITES } from "@/app/api/test/_store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getEmailFromCookie(req: Request) {
  const raw = req.headers.get("cookie") || "";
  const m = raw.match(/(?:^|;\s*)tp_test_user=([^;]+)/);
  let val = m?.[1] ?? "";
  try { val = decodeURIComponent(val); } catch {}
  if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
  return val.trim();
}

export async function POST(req: Request) {
  const who = getEmailFromCookie(req);
  const isAdmin = who === "admin@example.com";
  if (!isAdmin) {
    return NextResponse.json({ ok: false, code: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const token = String(body?.token || "");
  if (!token) {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  if (!INVITES.has(token)) {
    return NextResponse.json({ ok: false, code: "NOT_FOUND" }, { status: 404 });
  }

  INVITES.delete(token);
  return NextResponse.json({ ok: true });
}
