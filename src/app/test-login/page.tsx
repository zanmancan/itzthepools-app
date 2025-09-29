// src/app/test-login/page.tsx
"use client";

import { useState } from "react";

export default function TestLoginPage() {
  const [msg, setMsg] = useState<string>("");

  async function hit(user: string) {
    setMsg("…");
    const res = await fetch(`/api/test/login-as?user=${encodeURIComponent(user)}`, {
      method: "GET",
      credentials: "include",
    });
    const j = await res.json().catch(() => ({}));
    setMsg(JSON.stringify(j));
  }

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Test Login Helper</h1>
      <p className="text-sm opacity-80">
        Click a button to set the test cookie in <strong>this browser</strong>.
      </p>
      <div className="flex flex-wrap gap-2">
        <button className="rounded border px-3 py-1" onClick={() => hit("u_owner")}>Login as u_owner</button>
        <button className="rounded border px-3 py-1" onClick={() => hit("u_admin")}>Login as u_admin</button>
        <button className="rounded border px-3 py-1" onClick={() => hit("u_member")}>Login as u_member</button>
        <button className="rounded border px-3 py-1" onClick={() => hit("u_test")}>Login as u_test</button>
      </div>
      <pre className="rounded bg-black/30 p-3 text-sm">{msg || "No action yet."}</pre>
      <div className="text-sm">
        Then open <code>/api/test/whoami</code> or{" "}
        <code>/api/invites/context?leagueId=lg_owner</code> in this browser.
      </div>
    </main>
  );
}
