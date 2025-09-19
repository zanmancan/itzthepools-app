import { NextResponse } from "next/server";
import { supabaseRoute } from "@/lib/supabase-server";

// DELETE /api/invites/id/:id -> owner_revoke_invite
export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const sb = supabaseRoute();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { error } = await sb.rpc("owner_revoke_invite", { p_invite: params.id });
  if (error) return new NextResponse(error.message, { status: 400 });

  return NextResponse.json({ ok: true });
}
