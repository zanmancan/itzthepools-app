// src/components/AuthGate.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;

        if (!data.session) {
          router.replace("/login");
        } else {
          setReady(true);
        }
      } catch (e) {
        // On any unexpected error, fail closed to login
        console.error("AuthGate error:", e);
        if (mounted) router.replace("/login");
      }
    }

    check();

    // keep session fresh while the page is open
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="p-6 text-sm opacity-70">
        Checking authentication…
      </div>
    );
  }

  return <>{children}</>;
}
