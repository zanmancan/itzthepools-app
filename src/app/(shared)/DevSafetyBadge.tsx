"use client";

/**
 * DevSafetyBadge
 * - Renders a tiny "DEV" pill when NEXT_PUBLIC_E2E_DEV_SAFETY="1"
 * - No effect in prod builds
 */
export default function DevSafetyBadge() {
  if (typeof process === "undefined") return null;
  if (process.env.NEXT_PUBLIC_EE_DEV_FORCE === "1") {
    // manual override if you ever need to force on in a demo
  }
  if (process.env.NEXT_PUBLIC_E2E_DEV_SAFETY !== "1") return null;

  return (
    <span
      className="ml-2 inline-flex items-center gap-1 rounded-md border border-amber-400/60 bg-amber-200/10 px-2 py-0.5 text-[10px] font-semibold text-amber-300"
      title="E2E/Dev Safety is ON"
      data-testid="dev-safety-badge"
      aria-label="Developer Safety Badge"
    >
      DEV
    </span>
  );
}
