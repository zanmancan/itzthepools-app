"use client";

/**
 * SettingsClient — thin shell (owner-only in prod)
 * - Test ids:
 *   - [data-testid="league-settings"]
 */

export default function SettingsClient({ leagueId }: { leagueId: string }) {
  return (
    <section
      className="space-y-4"
      data-testid="league-settings"
      aria-label="League Settings"
    >
      <header className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
        <h1 className="text-xl font-semibold">League Settings</h1>
        <p className="text-xs text-neutral-400">
          League ID: <code className="opacity-75">{leagueId}</code>
        </p>
      </header>

      <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-2">
        <p className="text-sm text-neutral-300">
          Placeholder settings panel. We’ll wire real controls in Day 8.
        </p>
        <ul className="list-disc pl-5 text-sm text-neutral-400">
          <li>Rename league</li>
          <li>Manage members</li>
          <li>Danger zone (delete league)</li>
        </ul>
      </div>
    </section>
  );
}
