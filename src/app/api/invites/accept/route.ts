// src/app/api/invites/accept/route.ts
import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export async function POST(req: Request) {
  const { token } = await req.json().catch(() => ({} as { token?: string }));
  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { status: "error", message: "Missing token" },
      { status: 400 }
    );
    }

  const sb = supabaseRoute();

  // Minimal, safe default: find the invite and delete it (adjust to your real flow).
  const { data: invite, error } = await sb
    .from("invites")
    .select("id")
    .eq("token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { status: "error", message: "Invite not found" },
      { status: 404 }
    );
  }

  const { error: delErr } = await sb.from("invites").delete().eq("id", invite.id);
  if (delErr) {
    return NextResponse.json(
      { status: "error", message: delErr.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ status: "ok" });
}
