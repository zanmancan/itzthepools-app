import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic" as const;
export const runtime  = "nodejs" as const;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = String(url.searchParams.get("token") ?? "").trim();
  if (!token) return NextResponse.json({ ok: false, error: "token required" }, { status: 400 });

  const store = getStore();
  const inv = store.findInviteByToken(token);
  if (!inv) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });

  return NextResponse.json({ ok: true, invite: inv }, { status: 200 });
}
