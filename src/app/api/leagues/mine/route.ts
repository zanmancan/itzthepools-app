// src/app/api/leagues/mine/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getStore } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const c = await cookies();
  // Test user id is set by /api/test/login-as (or falls back to a known test id)
  const userId = c.get("tp_test_user")?.value ?? "u_test";

  const store = getStore();
  store.leagues ??= {};

  // NOTE: members is a Set<string>; use .has(), not [userId]
  const mine = Object.values(store.leagues).filter(
    (lg: any) => lg?.members?.has?.(userId)
  );

  return NextResponse.json(
    {
      leagues: mine.map((lg: any) => ({ id: lg.id, name: lg.name })),
    },
    { headers: { "cache-control": "no-store" } }
  );
}
