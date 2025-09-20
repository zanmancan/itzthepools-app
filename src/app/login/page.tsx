import { Suspense } from "react";
import LoginClient from "./LoginClient";

// ensure this page is SSR (not pre-rendered) to avoid static build flakiness
export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-10">
          <div className="card max-w-md">Loading…</div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
