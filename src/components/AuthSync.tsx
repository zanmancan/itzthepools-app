"use client";

import { useEffect } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function AuthSync() {
  useEffect(() => {
    const sb = supabaseBrowser();
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      // Keep server HttpOnly cookies in sync on sign in/out/refresh
      void fetch("/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event,
          session: session
            ? {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
              }
            : null,
        }),
      });
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return null;
}
