import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { supabaseService } from "@/lib/supabaseServer";
import { devlog } from "@/lib/devlog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Verify Resend webhook signature with HMAC-SHA256 */
function verifySignature(raw: string, sigHex: string, secret: string) {
  try {
    const expected = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sigHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export async function POST(req: Request) {
  // Read raw first so signature covers exact bytes
  const raw = await req.text();

  const sig = req.headers.get("x-resend-signature") ?? "";
  const secret = process.env.RESEND_WEBHOOK_SECRET || "";

  // Enforce signature only if configured (leave unset in local dev to skip)
  if (secret && (!sig || !verifySignature(raw, sig, secret))) {
    return new NextResponse("Webhook signature invalid.", { status: 400 });
  }

  // Parse JSON safely
  let body: any;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  // Normalize important fields
  const type: string = body?.type ?? "unknown";           // e.g., email.delivered / delivered
  const recipient: string | null =
    body?.data?.recipient ?? body?.data?.email ?? null;
  const messageId: string | null = body?.data?.message_id ?? null;
  const subject: string | null = body?.data?.subject ?? null;

  const client = supabaseService();

  // Compose a "wide" row that satisfies your current NOT NULL legacy columns
  const wideRow: Record<string, any> = {
    // new shape
    type,
    recipient,
    message_id: messageId,
    raw: body,

    // legacy shape
    event_type: type,           // your table requires this NOT NULL
    provider: "resend",         // your table requires this NOT NULL
    payload: body,              // your table requires this NOT NULL
    to_email: recipient ?? null,
    subject: subject ?? null,
  };

  // 1) Try wide insert first (works on your current DB)
  let { error } = await client.from("email_events").insert(wideRow as any);

  // 2) If this DB doesn't have legacy columns, fall back to minimal insert
  if (error && isUnknownColumn(error)) {
    const fallback = await client.from("email_events").insert({
      type,
      recipient,
      message_id: messageId,
      raw: body,
    });
    error = fallback.error ?? null;
  }

  if (error) {
    devlog("[resend webhook][insert error]", error);
    // Return the error in dev to make troubleshooting easy; still 200 to avoid hammer retries
    if (process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG === "1") {
      return NextResponse.json({ ok: false, stored: false, error }, { status: 200 });
    }
    return NextResponse.json({ ok: false, stored: false }, { status: 200 });
  }

  devlog("[resend webhook]", { type, recipient, messageId });
  return NextResponse.json({ ok: true, stored: true });
}
