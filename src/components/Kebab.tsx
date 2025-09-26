"use client";

import Link from "next/link";
import { useId, useState } from "react";

type Action =
  | { key: string; label: string; href: string }
  | { key: string; label: string; onClick: () => void };

export default function Kebab(props: {
  actions: Action[];
  size?: number;
  ariaLabel?: string;
  // any extra test ids pass-through
  [dataAttr: `data-${string}`]: any;
}) {
  const { actions, size = 20, ariaLabel = "More actions", ...rest } = props;
  const [open, setOpen] = useState(false);
  const id = useId();

  function closeSoon() {
    // tiny delay so clicks register
    setTimeout(() => setOpen(false), 0);
  }

  return (
    <div className="relative" {...rest}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center justify-center rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-amber-400"
        data-testid={`${rest["data-testid"]}-button`}
      >
        {/* 3-dot icon; no external libs */}
        <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" role="img">
          <circle cx="5" cy="12" r="2" fill="currentColor" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
          <circle cx="19" cy="12" r="2" fill="currentColor" />
        </svg>
        <span className="sr-only">{ariaLabel}</span>
      </button>

      {open && (
        <ul
          id={id}
          role="menu"
          className="absolute right-0 z-10 mt-2 w-40 overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-xl"
          onBlur={closeSoon}
        >
          {actions.map((a) => {
            const itemTid = `${rest["data-testid"]}-item-${a.key}`;
            const base =
              "block w-full text-left px-3 py-2 text-sm hover:bg-neutral-800 focus:bg-neutral-800";
            if ("href" in a) {
              return (
                <li key={a.key} role="none">
                  <Link
                    href={a.href}
                    role="menuitem"
                    className={base}
                    data-testid={itemTid}
                    onClick={closeSoon}
                  >
                    {a.label}
                  </Link>
                </li>
              );
            }
            return (
              <li key={a.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={base}
                  data-testid={itemTid}
                  onClick={() => {
                    try {
                      a.onClick();
                    } finally {
                      closeSoon();
                    }
                  }}
                >
                  {a.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
