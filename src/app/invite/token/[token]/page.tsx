// src/app/invite/token/[token]/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy redirect from /invite/token/:token → /invite/:token
 * Keeps old links working.
 */
export default function LegacyInviteRedirect({ params }: { params: { token: string } }) {
  redirect(`/invite/${params.token}`);
}
