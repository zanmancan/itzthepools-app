// src/app/api/leagues/mine/route.ts
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { USE_SUPABASE } from "@/lib/backend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/leagues/mine
 * When USE_SUPABASE=1:
 *   returns { leagues: Array<{id:string, name:string}> } for the authed user (owner)
 * Otherwise:
 *   404 (client will fall back to dev endpoints)
 */
export async function GET() {
  if (!USE_SUPABASE) return new NextResponse("Not Found", { status: 404 });

  try {
    const sb = supabaseServer();
    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData?.user?.email) {
      return NextResponse.json({ leagues: [] }); // unauthenticated → empty
    }

    // Assumed schema: table "leagues" with columns: id (text/uuid), name (text), owner_email (text)
    const { data, error } = await sb
      .from("leagues")
      .select("id, name, owner_email")
      .eq("owner_email", userData.user.email);

    if (error) {
      // Soft-fail to empty list; read-only
      return NextResponse.json({ leagues: [] });
    }

    const leagues =
      (data ?? []).map((r: any) => ({ id: String(r.id), name: String(r.name) })) || [];

    return NextResponse.json({ leagues });
  } catch {
    return NextResponse.json({ leagues: [] });
  }
}
