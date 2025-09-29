import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

/** Read the dev user id from cookies (supports both tp_test_user and tp_user). */
function getUserIdFromCookies(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") ?? "";

  // Try tp_test_user first, then tp_user
  const m1 = /(?:^|;\s*)tp_test_user=([^;]+)/i.exec(cookieHeader);
  const m2 = /(?:^|;\s*)tp_user=([^;]+)/i.exec(cookieHeader);

  const raw = m1?.[1] ?? m2?.[1] ?? null;
  if (!raw) return null;

  try {
    return decodeURIComponent(raw);
  } catch {
    return raw; // fall back to raw if somehow not encoded
  }
}

export async function GET(req: Request) {
  const store = getStore();
  const userId = getUserIdFromCookies(req);

  // No login cookie? empty list (dashboard expects this)
  if (!userId) {
    return NextResponse.json({ ok: true, leagues: [] });
  }

  const leagues = Object.values(store.leagues)
    .filter((lg) => userId in (lg.members ?? {}))
    .map((lg) => ({ id: lg.id, name: lg.name }));

  return NextResponse.json({ ok: true, leagues });
}
