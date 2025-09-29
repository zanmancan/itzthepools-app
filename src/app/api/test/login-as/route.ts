// src/app/api/test/login-as/route.ts
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Set a test user cookie. Example:
 *   GET /api/test/login-as?user=u_owner
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("user")?.trim() || "";
  if (!u) {
    return new Response(JSON.stringify({ ok: false, error: "Missing user" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  // Write several cookie names for robustness
  const cookieVal = `${u}; Path=/; HttpOnly; SameSite=Lax`;
  ["e2e_user", "x-e2e-user", "e2e-test-user", "x-test-user"].forEach((name) => {
    headers.append("set-cookie", `${name}=${cookieVal}`);
  });

  return new Response(JSON.stringify({ ok: true, user: u }), { status: 200, headers });
}
