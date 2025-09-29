import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/app/api/test/_store";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const splitEmails = (raw: string | null | undefined) =>
  (raw ?? "")
    .split(/[\s,]+/g)
    .map(e => e.trim().toLowerCase())
    .filter(Boolean);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const store = getStore();
    store.invites ??= {};
    store.memberships ??= {};

    const leagueId = params.id;
    const league = store.leagues?.[leagueId];
    if (!league) return NextResponse.json({ ok: false, error: "League not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const emailsRaw: string = typeof body?.emails === "string" ? body.emails : "";
    const emails = [...new Set(splitEmails(emailsRaw))];

    if (emails.length === 0) {
      return NextResponse.json({ ok: false, error: "No emails provided", results: [] }, { status: 200 });
    }

    const invalid: string[] = [];
    const valid = emails.filter(e => {
      const ok = EMAIL_RE.test(e);
      if (!ok) invalid.push(e);
      return ok;
    });

    const results: Array<{ email: string; token?: string; error?: string }> = [];

    for (const email of valid) {
      const token = Math.random().toString(36).slice(2, 18);
      const id = crypto.randomUUID();

      store.invites[token] = {
        id,
        token,
        email,
        league_id: leagueId,
        is_public: false,
        used: false,
        revoked: false,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };

      results.push({ email, token });
    }

    for (const email of invalid) results.push({ email, error: "invalid_email" });

    return NextResponse.json({ ok: true, leagueId, results }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, error: "Bulk invite failed" }, { status: 200 });
  }
}
