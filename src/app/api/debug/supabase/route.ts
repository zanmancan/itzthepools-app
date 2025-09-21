// Dev-only diagnostic: verifies envs and that service-role inserts work.
// Safe to keep in repo; responds only in development.

import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabaseServer";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Decode a JWT payload segment (base64url) and extract the `role` claim.
function peekRole(jwt: string | undefined | null) {
  try {
    if (!jwt) return null;
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1]!; // safe after length check
    let b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const pad = b64.length % 4;
    if (pad) b64 += "=".repeat(4 - pad);
    const json = Buffer.from(b64, "base64").toString("utf8");
    const obj = JSON.parse(json);
    return obj?.role ?? null;
  } catch {
    return null;
  }
}

function isUnknownColumn(err: any) {
  const msg = String(err?.message || "").toLowerCase();
  return msg.includes("column") && msg.includes("does not exist");
}

export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse("Not found", { status: 404 });
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "").trim();
  const svc = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  const info = {
    urlHost: (() => { try { return new URL(url).host; } catch { return null; } })(),
    anonLen: anon.length,
    svcLen: svc.length,
    anonHead: anon.slice(0, 12),
    svcHead: svc.slice(0, 12),
    anonRoleClaim: peekRole(anon), // "anon"
    svcRoleClaim: peekRole(svc),   // "service_role"
  };

  try {
    const client = supabaseService();
    const msgId = `debug_${Date.now()}`;

    // "Wide" row covers legacy schema and new schema at once.
    const wideRow: Record<string, any> = {
      // new shape
      type: "debug",
      recipient: "local@test",
      message_id: msgId,
      raw: { hello: "world" },

      // legacy shape (not null in your DB)
      event_type: "debug",
      provider: "resend",
      payload: { hello: "world" },
      to_email: "local@test",
      subject: "[debug]",
    };

    // 1) Try wide insert (works on your current DB)
    let insert = await client.from("email_events").insert(wideRow as any);

    // 2) If this DB doesn't have legacy columns, fall back to minimal
    if (insert.error && isUnknownColumn(insert.error)) {
      insert = await client.from("email_events").insert({
        type: "debug",
        recipient: "local@test",
        message_id: msgId,
        raw: { hello: "world" },
      });
    }

    const del = await client.from("email_events").delete().eq("message_id", msgId);
    const ok = !insert.error && !del.error;
    return NextResponse.json({ ok, info, insert, del });
  } catch (e: any) {
    return NextResponse.json({ ok: false, info, error: String(e?.message || e) });
  }
}
