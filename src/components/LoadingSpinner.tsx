// src/components/LoadingSpinner.tsx
"use client";

import { useId } from "react";

type Props = {
  label?: string;
  className?: string;
  size?: number; // px
};

export default function LoadingSpinner({ label = "Loading…", className, size = 20 }: Props) {
  const id = useId();
  const s = `${size}px`;
  const classes = ["inline-flex items-center gap-2 text-sm text-neutral-400", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes}>
      <svg
        width={s}
        height={s}
        viewBox="0 0 24 24"
        role="status"
        aria-labelledby={id}
        className="animate-spin"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.2" />
        <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
      </svg>
      <span id={id} className="sr-only">
        {label}
      </span>
    </div>
  );
}
