import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

/** POST { token, teamName } -> accept + set team name (atomic) */
export async function POST(req: NextRequest) {
  try {
    const { token, teamName } = await req.json();
    if (!token || !teamName) {
      return new NextResponse("Missing token or teamName", { status: 400 });
    }

    const sb = supabaseRoute();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    const { error } = await sb.rpc("accept_invite_with_name", {
      p_token: token,
      p_team_name: teamName
    });
    if (error) return new NextResponse(error.message, { status: 400 });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}
