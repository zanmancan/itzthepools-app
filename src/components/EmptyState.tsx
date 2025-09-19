// src/components/EmptyState.tsx
"use client";

import { ReactNode } from "react";

type Props = {
  title: string;
  description?: string;
  action?: ReactNode; // button/link
};

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="w-full py-12 text-center text-neutral-400">
      <h3 className="mb-2 text-base font-semibold text-neutral-200">{title}</h3>
      {description && <p className="mx-auto mb-4 max-w-md text-sm">{description}</p>}
      {action}
    </div>
  );
}
