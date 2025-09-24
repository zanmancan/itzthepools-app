// src/app/api/test/login-as/route.ts
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/** Test helper: set tp_test_user cookie to simulate auth. Body: { email: string } */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  const body = await req.json().catch(() => ({}));
  const email = String(body?.email || "").trim();

  if (!email) {
    return NextResponse.json(
      { ok: false, code: "BAD_REQUEST", message: "email required" },
      { status: 400 }
    );
  }

  const res = NextResponse.json({ ok: true, email });

  res.cookies.set({
    name: "tp_test_user",
    value: email, // plain string
    httpOnly: true,
    sameSite: "lax", // must be sent on same-site POST/fetch
    secure: false,   // dev only
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}
