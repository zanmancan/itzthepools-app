import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime = "nodejs" as const;

export async function GET() {
  const store = getStore();
  // simple dev endpoint: return all leagues
  return NextResponse.json({ ok: true, leagues: store.LEAGUES }, { status: 200 });
}
