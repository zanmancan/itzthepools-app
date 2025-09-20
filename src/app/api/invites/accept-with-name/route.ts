// src/app/api/invites/accept-with-name/route.ts
import { type NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { token, teamName } -> accept + set team name (atomic) */
export async function POST(req: NextRequest) {
  try {
    // Parse body safely
    let token: string | undefined;
    let teamName: string | undefined;
    try {
      const body = (await req.json()) as { token?: string; teamName?: string };
      token = body?.token;
      teamName = body?.teamName;
    } catch {
      // ignore – handled below
    }
    if (!token || !teamName) {
      return NextResponse.json({ error: "Missing token or teamName" }, { status: 400 });
    }

    // Cookie-bound Supabase client + a response shell that carries Set-Cookie
    const { client: sb, response } = supabaseRoute(req);

    // Require an authenticated user
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();

    if (userErr) {
      return NextResponse.json(
        { error: userErr.message ?? "Auth error" },
        { status: 500, headers: response.headers }
      );
    }
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: response.headers }
      );
    }

    // Call RPC that accepts invite and sets team name atomically
    const { error } = await sb.rpc("accept_invite_with_name", {
      p_token: token,
      p_team_name: teamName,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: response.headers }
      );
    }

    // Success – include the helper's headers so any auth cookie writes persist
    return NextResponse.json({ ok: true }, { headers: response.headers });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
