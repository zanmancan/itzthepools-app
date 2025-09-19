import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

export async function GET() {
  const sb = supabaseRoute();
  const { data: { user } } = await sb.auth.getUser();
  return NextResponse.json({ user });
}
