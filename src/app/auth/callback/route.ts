// src/app/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { client, response } = supabaseServer(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") || "/dashboard";
  const errorDesc = url.searchParams.get("error_description");

  // If no code, push back to verify page (shows “check your email / enter code”).
  if (!code) {
    const outUrl = new URL(`/verify?next=${encodeURIComponent(next)}`, req.url);
    if (errorDesc) outUrl.searchParams.set("err", errorDesc);
    const out = NextResponse.redirect(outUrl);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  }

  // Exchange the code for a session cookie
  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    const outUrl = new URL(`/verify?next=${encodeURIComponent(next)}`, req.url);
    if (errorDesc) outUrl.searchParams.set("err", errorDesc);
    const out = NextResponse.redirect(outUrl);
    response.cookies.getAll().forEach((c) => out.cookies.set(c));
    return out;
  }

  // Success → go back to where we were headed (e.g., /invite/[token])
  const out = NextResponse.redirect(new URL(next, req.url));
  response.cookies.getAll().forEach((c) => out.cookies.set(c));
  return out;
}
