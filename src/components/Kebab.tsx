"use client";

import { useState, PropsWithChildren } from "react";

type Props = {
  /** league id used in data-testids, e.g. lg_open */
  id: string;
  /** When present, show “Open” item */
  onOpen?: () => void;
  /** When present, show “Settings” item */
  onSettings?: () => void;
  /** When present, show “Invite” item */
  onInvite?: () => void;
};

export default function Kebab({ id, onOpen, onSettings, onInvite }: PropsWithChildren<Props>) {
  const [open, setOpen] = useState(false);
  const tid = (suffix: string) => `kebab-${id}-${suffix}`;

  return (
    <div data-testid={`kebab-${id}`} className="relative inline-block text-left">
      <button
        data-testid={tid("button")}
        onClick={() => setOpen((v) => !v)}
        className="rounded-md border border-neutral-700 px-2 py-1 text-sm hover:bg-neutral-800"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        …
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-neutral-700 bg-neutral-900 p-1 shadow"
          onMouseLeave={() => setOpen(false)}
        >
          {onOpen && (
            <button
              data-testid={tid("item-open")}
              onClick={() => {
                setOpen(false);
                onOpen();
              }}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-800"
            >
              Open
            </button>
          )}
          {onSettings && (
            <button
              data-testid={tid("item-settings")}
              onClick={() => {
                setOpen(false);
                onSettings();
              }}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-800"
            >
              Settings
            </button>
          )}
          {onInvite && (
            <button
              data-testid={tid("item-invite")}
              onClick={() => {
                setOpen(false);
                onInvite();
              }}
              className="block w-full rounded px-2 py-1 text-left text-sm hover:bg-neutral-800"
            >
              Invite
            </button>
          )}
        </div>
      )}
    </div>
  );
}
