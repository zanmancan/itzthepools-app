import { NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") ?? "";
  const store: any = getStore();
  const inv = (store.invites ?? []).find((x: any) => x.token === token);
  if (!inv) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true, invite: inv });
}
