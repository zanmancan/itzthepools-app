import { NextRequest, NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabaseServer";

// GET /api/leagues/:id/members  -> owner_list_members
export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const sb = supabaseRoute();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data, error } = await sb.rpc("owner_list_members", { p_league: params.id });
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json(data ?? []);
}

// DELETE /api/leagues/:id/members  (body: { userId })
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await req.json();
  if (!userId) return new NextResponse("Missing userId", { status: 400 });

  const sb = supabaseRoute();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { error } = await sb.rpc("owner_remove_member", {
    p_league: params.id,
    p_user: userId,
  });
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
