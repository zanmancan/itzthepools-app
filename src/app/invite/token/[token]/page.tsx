// src/app/invite/token/[token]/page.tsx
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Legacy redirect: we used to generate links as /invite/token/:token.
 * The real accept page now lives at /invite/:token.
 * Keeping this file ensures old links never 404.
 */
export default function LegacyInviteRedirect(props: { params: { token: string } }) {
  const { token } = props.params;
  redirect(`/invite/${token}`);
}
