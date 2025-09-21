// src/app/api/leagues/[id]/invites/route.ts
import { NextRequest } from "next/server";
import { supabaseRoute, jsonWithRes } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: { id: string } };

type Invite = {
  id: string;
  league_id: string;
  email: string | null;
  token: string;
  created_at: string | null;
  expires_at: string | null;
  accepted: boolean | null;
  accepted_at: string | null;
  revoked_at: string | null;
  // optional shape (may not exist in DB)
  is_public?: boolean | null;
};

function bucketize(list: Invite[]) {
  const nowIso = new Date().toISOString();
  const open = list.filter(
    (i) => !i.accepted && !i.revoked_at && !!i.expires_at && String(i.expires_at) > nowIso
  );
  const accepted = list.filter((i) => i.accepted || !!i.accepted_at);
  const denied = list.filter(
    (i) => !i.accepted && (!!i.revoked_at || !i.expires_at || String(i.expires_at) <= nowIso)
  );
  return { open, accepted, denied };
}

export async function GET(req: NextRequest, { params }: Params) {
  const { client: sb, response: res } = supabaseRoute(req);
  const leagueId = params.id;

  // auth
  const {
    data: { user },
    error: uerr,
  } = await sb.auth.getUser();
  if (uerr) return jsonWithRes(res, { error: uerr.message, open: [], accepted: [], denied: [] }, 500);
  if (!user) return jsonWithRes(res, { error: "Unauthorized", open: [], accepted: [], denied: [] }, 401);

  // role check
  const { data: lm, error: lmErr } = await sb
    .from("league_members")
    .select("role")
    .eq("league_id", leagueId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (lmErr) return jsonWithRes(res, { error: lmErr.message, open: [], accepted: [], denied: [] }, 500);

  const isOwnerOrAdmin = lm && ["owner", "admin"].includes(String(lm.role || "").toLowerCase());
  if (!isOwnerOrAdmin) {
    return jsonWithRes(res, { error: "Forbidden", open: [], accepted: [], denied: [] }, 403);
  }

  // --- Fetch with graceful fallback for missing columns ---
  const baseCols =
    "id, league_id, email, token, created_at, expires_at, accepted, accepted_at, revoked_at";
  const tryCols = `${baseCols}, is_public`; // may not exist in older DBs

  // First attempt: include is_public
  let rows: Invite[] = [];
  let firstErr: string | null = null;

  {
    const { data, error } = await sb
      .from("invites")
      .select(tryCols)
      .eq("league_id", leagueId)
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data)) {
      rows = data as Invite[];
    } else if (error && /column .*is_public.* does not exist/i.test(error.message)) {
      // Retry without is_public
      const { data: data2, error: error2 } = await sb
        .from("invites")
        .select(baseCols)
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false });

      if (error2) {
        firstErr = error2.message;
      } else {
        // synthesize is_public from "no email = public"
        rows = (data2 as Invite[]).map((r) => ({ ...r, is_public: r.email == null }));
      }
    } else if (error) {
      firstErr = error.message;
    }
  }

  if (!rows.length && firstErr) {
    // Return empty arrays but with error string so UI shows a friendly message and never crashes
    return jsonWithRes(res, { error: `Failed to load invites: ${firstErr}`, open: [], accepted: [], denied: [] }, 400);
  }

  // Bucket and return — ALWAYS arrays
  const { open, accepted, denied } = bucketize(rows);
  return jsonWithRes(res, { ok: true, open, accepted, denied });
}
