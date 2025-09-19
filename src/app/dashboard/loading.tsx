// src/app/dashboard/loading.tsx
"use client";

import LoadingSpinner from "@/components/LoadingSpinner";
// NOTE: named export
import { useLoadingDelay } from "@/hooks/useLoadingDelay";

export default function DashboardLoading() {
  // Your hook expects a boolean first, optional delay second.
  const show = useLoadingDelay(true, 200);

  return (
    <div className="card max-w-2xl">
      <div className="h1">Dashboard</div>
      <p className="mt-2 opacity-70">{show ? <LoadingSpinner /> : "Loading…"}</p>
    </div>
  );
}
