"use client";

const KEY = "pending_invite_token";

/** Save token to localStorage and a short-lived cookie (fallback). */
export function savePendingInvite(token: string) {
  try {
    localStorage.setItem(KEY, token);
  } catch {}
  try {
    document.cookie = `${KEY}=${encodeURIComponent(token)}; Path=/; Max-Age=86400; SameSite=Lax`;
  } catch {}
}

export function getPendingInvite(): string | null {
  try {
    const t = localStorage.getItem(KEY);
    if (t) return t;
  } catch {}
  // cookie fallback
  const m = document.cookie.match(new RegExp(`(?:^|; )${KEY}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  try {
    document.cookie = `${KEY}=; Path=/; Max-Age=0; SameSite=Lax`;
  } catch {}
}
