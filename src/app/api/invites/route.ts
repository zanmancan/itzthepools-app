import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

/**
 * POST /api/invites
 * body: { leagueId: string, email?: string, note?: string, expiresAt?: string | null }
 * returns: { id: string, joinUrl: string }
 */
export async function POST(req: NextRequest) {
  try {
    const { leagueId, email, note, expiresAt } = await req.json();
    if (!leagueId) return new NextResponse("Missing leagueId", { status: 400 });

    const sb = supabaseRoute();
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return new NextResponse("Unauthorized", { status: 401 });

    // Owner check
    const { data: ownerRow, error: ownErr } = await sb
      .from("leagues")
      .select("id, signup_deadline")
      .eq("id", leagueId)
      .eq("owner_id", user.id)
      .single();
    if (ownErr || !ownerRow) return new NextResponse("Not owner", { status: 403 });

    // Use explicit expiresAt, else default to league signup_deadline (if set), else null
    const expAt =
      typeof expiresAt === "string"
        ? new Date(expiresAt).toISOString()
        : ownerRow.signup_deadline ?? null;

    const { data: invite, error } = await sb
      .from("invites")
      .insert({ league_id: leagueId, email: email ?? null, note: note ?? null, expires_at: expAt })
      .select("id, token")
      .single();

    if (error) return new NextResponse(error.message, { status: 400 });

    const url = new URL(req.url);
    const joinUrl = `${url.origin}/join/${invite.token}`;

    // Optional: send email via Resend if configured and email provided
    if (email && process.env.RESEND_API_KEY && process.env.INVITES_FROM_EMAIL) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: process.env.INVITES_FROM_EMAIL,
            to: email,
            subject: "You’re invited to join a league on Itz The Pools",
            html: `
              <p>You’ve been invited to join a league.</p>
              ${note ? `<p><em>Note from the owner:</em> ${escapeHtml(note)}</p>` : ""}
              <p><a href="${joinUrl}">Click here to accept the invite</a></p>
            `,
          }),
        });
        // Ignore non-200 here; the invite still exists
        await r.text();
      } catch {
        // swallow — UI already has the copyable link
      }
    }

    return NextResponse.json({ id: invite.id, joinUrl });
  } catch (e: any) {
    return new NextResponse(e?.message ?? "Server error", { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
