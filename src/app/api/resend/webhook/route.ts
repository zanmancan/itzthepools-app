// src/app/api/resend/webhook/route.ts
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// NOTE: Add RESEND_WEBHOOK_SECRET in env and verify signatures later.
// For first pass we'll just accept JSON and save it.

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    // Normalize a few common fields (Resend sends different shapes per event)
    const type: string =
      payload?.type?.toString()?.toLowerCase() ||
      payload?.event?.toString()?.toLowerCase() ||
      "unknown";

    const data = payload?.data ?? payload?.email ?? payload;
    const messageId =
      data?.id || data?.message_id || data?.headers?.["Message-Id"] || null;
    const toEmail =
      data?.to ||
      data?.recipient ||
      data?.email ||
      (Array.isArray(data?.to) ? data.to[0] : null) ||
      null;
    const subject = data?.subject || null;

    const admin = supabaseAdmin();
    const { error } = await admin.from("email_events").insert({
      event_type: type,
      provider: "resend",
      message_id: messageId,
      to_email: toEmail,
      subject,
      payload,
    });

    if (error) {
      console.error("[resend webhook] insert error", error);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[resend webhook] bad JSON", e?.message || e);
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
}
