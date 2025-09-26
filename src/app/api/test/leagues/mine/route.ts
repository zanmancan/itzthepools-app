// src/app/api/test/leagues/mine/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LEAGUES } from "@/app/api/test/_store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProd() {
  return process.env.NODE_ENV === "production";
}

function getViewerEmail(): string {
  const raw = cookies().get("tp_test_user")?.value ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export async function GET() {
  if (isProd()) return new NextResponse("Not Found", { status: 404 });
  const email = getViewerEmail();
  const leagues = Array.from(LEAGUES.values())
    .filter((l) => l.ownerEmail === email)
    .map((l) => ({ id: l.id, name: l.name }));
  return NextResponse.json({ leagues });
}
