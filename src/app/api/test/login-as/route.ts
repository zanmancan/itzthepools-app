// src/app/api/test/login-as/route.ts
import { NextResponse } from "next/server";

function isProd() {
  return process.env.NODE_ENV === "production";
}

/**
 * Test helper: set tp_test_user cookie to simulate auth.
 * Body: { email: string }
 */
export async function POST(req: Request) {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });

  let email = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "");
  } catch {
    // ignore; stay empty => will set a blank cookie (effectively logout)
  }

  // Set a simple, plain cookie value (NOT URL-encoded), path "/"
  const res = NextResponse.json({ ok: true, email });

  res.cookies.set({
    name: "tp_test_user",
    value: email, // plain string
    httpOnly: true,
    sameSite: "lax", // IMPORTANT so it’s sent on same-site POST/fetch
    secure: false,   // dev only
    path: "/",       // must be root so /api/invites/accept receives it
    maxAge: 60 * 60, // 1 hour
  });

  return res;
}
