// src/lib/time.ts
const ET_TZ = "America/New_York";

// Format UTC epoch ms in the user's local timezone
export function formatLocal(utcMs: number, opts: Intl.DateTimeFormatOptions = {}) {
  const d = new Date(utcMs);
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(d);
}

// For admin/logs (ET formatting)
export function formatET(utcMs: number, opts: Intl.DateTimeFormatOptions = {}) {
  const d = new Date(utcMs);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TZ,
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(d);
}
