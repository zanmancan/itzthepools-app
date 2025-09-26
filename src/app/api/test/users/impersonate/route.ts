// src/app/api/test/users/impersonate/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * POST /api/test/users/impersonate
 * body: { email: string }
 *
 * Sets a non-HttpOnly cookie `tp_test_user=<email>` for dev tests.
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim();
  if (!email) return new NextResponse("email required", { status: 400 });

  const res = NextResponse.json({ ok: true, email });
  res.headers.append(
    "Set-Cookie",
    `tp_test_user=${encodeURIComponent(email)}; Path=/; SameSite=Lax`
  );
  return res;
}
