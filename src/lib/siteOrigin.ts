// src/lib/siteOrigin.ts

/**
 * Returns the canonical site origin (protocol + host) with no trailing slash.
 * Prefers NEXT_PUBLIC_SITE_URL so links are consistent across
 * local dev, previews, and production.
 *
 * Examples:
 *  - http://localhost:3001
 *  - https://itzthepools.com
 *  - https://<your-netlify-preview-domain>
 */

function stripTrailingSlash(u: string) {
  return u.replace(/\/+$/, "");
}

export function siteOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return stripTrailingSlash(configured);
  }

  // Server fallback (keeps this file safely importable by client code too)
  if (typeof window === "undefined") return "http://localhost:3001";

  // Browser last-resort
  return stripTrailingSlash(window.location.origin);
}

/** Convenience: build an absolute URL from a path or relative href. */
export function absoluteUrl(path: string): string {
  const base = siteOrigin();
  if (!path) return base;
  return new URL(path, base).toString();
}
