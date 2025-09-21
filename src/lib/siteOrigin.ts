// src/lib/siteOrigin.ts

/**
 * Returns the canonical site origin (protocol + host) with no trailing slash.
 * Prefers NEXT_PUBLIC_SITE_URL everywhere so links are consistent across
 * local dev, previews, and production.
 *
 * Examples:
 *  - http://localhost:3001
 *  - https://itzthepools.com
 *  - https://<your-netlify-preview-domain>
 */

function sanitize(url: string) {
  return url.replace(/\/+$/, "");
}

export function siteOrigin(): string {
  // 1) Always prefer the configured canonical URL
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured && /^https?:\/\//i.test(configured)) {
    return sanitize(configured);
  }

  // 2) Fallbacks
  if (typeof window === "undefined") {
    // Server: don't rely on headers here so this file can be imported by client code.
    // Default dev port is 3001 per your setup.
    return "http://localhost:3001";
  }

  // 3) Browser: last resort use the runtime origin
  return sanitize(window.location.origin);
}

/**
 * Build an absolute URL using the canonical origin.
 * Accepts either a path ("/invite/abc") or a relative URL ("invite/abc").
 */
export function absoluteUrl(path: string): string {
  const base = siteOrigin();
  if (!path) return base;
  return new URL(path, base).toString();
}
