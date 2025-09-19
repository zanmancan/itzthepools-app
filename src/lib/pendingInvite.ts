// src/lib/pendingInvite.ts

const KEY = "pending_invite_token";

/**
 * Extract ?invite=... from a query string.
 */
export function getInviteTokenFromSearch(search: string): string | null {
  const match = /(?:^|\?|&)invite=([^&]+)/.exec(search);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Read token from window.location if available.
 */
export function getInviteToken(): string | null {
  if (typeof window === "undefined") return null;
  return getInviteTokenFromSearch(window.location.search);
}

/**
 * Persist a token so you can redirect through auth and resume.
 */
export function savePendingInvite(token: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, token);
  } catch (e) {
    console.warn("Failed to save pending invite:", e);
  }
}

/**
 * Retrieve a previously saved token.
 */
export function readPendingInvite(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

/**
 * Remove any stored token.
 */
export function clearPendingInvite() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch (e) {
    console.warn("Failed to clear pending invite:", e);
  }
}
