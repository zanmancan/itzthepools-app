// src/app/api/invites/create/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PostBody = { league_id?: string; email?: string | null; isPublic?: boolean };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function absoluteUrl(req: NextRequest, path: string) {
  const fallbackOrigin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const origin = process.env.NEXT_PUBLIC_SITE_URL || fallbackOrigin;
  return new URL(path, origin).toString();
}

/** Ensure we forward any Set-Cookie headers returned by supabaseRoute */
function jsonWithRes(res: NextResponse, body: unknown, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...Object.fromEntries(res.headers),
    },
  });
}

export async function POST(req: NextRequest) {
  // initialize cookie-bound Supabase and a response shell
  let sb: ReturnType<typeof supabaseRoute>["client"];
  let res: NextResponse;
  try {
    ({ client: sb, response: res } = supabaseRoute(req));
  } catch (e: any) {
    const msg = e?.message || String(e);
    // no res to merge yet, so return a plain JSON response
    return NextResponse.json({ error: `supabase client init failed: ${msg}` }, { status: 500 });
  }

  try {
    // --- auth ---
    const {
      data: { user },
      error: userErr,
    } = await sb.auth.getUser();
    if (userErr) return jsonWithRes(res, { error: `auth error: ${userErr.message}` }, 500);
    if (!user) return jsonWithRes(res, { error: "unauthenticated" }, 401);

    // --- body ---
    const body = (await req.json().catch(() => ({}))) as PostBody;
    const league_id = body.league_id?.trim();
    const rawEmail =
      body.email === null ? null : (body.email ?? "").trim().toLowerCase();
    const isPublic = !!body.isPublic;

    if (!league_id) return jsonWithRes(res, { error: "league_id required" }, 400);
    if (!isPublic && !rawEmail)
      return jsonWithRes(res, { error: "email required (or choose public link)" }, 400);
    if (!isPublic && rawEmail && !isValidEmail(rawEmail))
      return jsonWithRes(res, { error: "invalid email" }, 400);

    // --- must be owner/admin ---
    const { data: membership, error: memErr } = await sb
      .from("league_members")
      .select("role")
      .eq("league_id", league_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (memErr)
      return jsonWithRes(res, { error: `membership lookup failed: ${memErr.message}` }, 400);

    if (!membership || !["owner", "admin"].includes(membership.role as any)) {
      return jsonWithRes(res, { error: "only league owner/admin can invite" }, 403);
    }

    // --- optional duplicate pending check (only for targeted email) ---
    if (!isPublic && rawEmail) {
      const { data: existing, error: exErr } = await sb
        .from("invites")
        .select("id, accepted")
        .eq("league_id", league_id)
        .eq("email", rawEmail)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (exErr)
        return jsonWithRes(res, { error: `invite check failed: ${exErr.message}` }, 400);

      if (existing && existing.accepted === false) {
        return jsonWithRes(res, { error: "pending invite already exists for this email" }, 409);
      }
    }

    // --- token ---
    const token =
      (globalThis.crypto?.randomUUID?.() ??
        Math.random().toString(36).slice(2)) as string;

    // --- insert invite ---
    const { error: insErr } = await sb.from("invites").insert({
      league_id,
      email: isPublic ? null : rawEmail,
      invited_by: user.id,
      token,
      accepted: false,
    });
    if (insErr) return jsonWithRes(res, { error: `insert failed: ${insErr.message}` }, 400);

    const acceptPath = `/invite/${token}`;
    const acceptUrl = absoluteUrl(req, acceptPath);

    // --- best-effort email ---
    if (!isPublic && rawEmail && process.env.RESEND_API_KEY) {
      try {
        // Fetch league name (best-effort)
        let leagueName = "your league";
        const { data: ldata } = await sb
          .from("leagues")
          .select("name")
          .eq("id", league_id)
          .maybeSingle();
        if (ldata?.name) leagueName = ldata.name;

        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM ?? "invites@itzthepools.com",
            to: rawEmail,
            subject: `You're invited to join ${leagueName}`,
            html: `
              <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif">
                <p>You’ve been invited to join <strong>${leagueName}</strong>.</p>
                <p><a href="${acceptUrl}" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none">Accept Invite</a></p>
                <p>Or copy this link: <br><a href="${acceptUrl}">${acceptUrl}</a></p>
              </div>
            `,
          }),
        }).catch(() => {});
      } catch {
        // email failure should not block invite creation
      }
    }

    return jsonWithRes(res, { ok: true, token, acceptUrl }, 200);
  } catch (e: any) {
    return jsonWithRes(res, { error: e?.message ?? "unknown server error" }, 500);
  }
}
