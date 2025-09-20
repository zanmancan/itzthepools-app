"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export const dynamic = "force-dynamic";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-md p-10 text-gray-400">
          Finishing sign-in…
        </div>
      }
    >
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const sb = supabaseBrowser();

  const next = sp.get("next") || "/dashboard";
  const error = sp.get("error");
  const error_description = sp.get("error_description");

  const [message, setMessage] = useState("Finishing sign-in…");

  const fullUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }, []);

  useEffect(() => {
    (async () => {
      if (error) {
        setMessage(`Auth error: ${error_description || error}`);
        return;
      }

      try {
        // Preferred (modern supabase-js): pass the full callback URL
        const { error: exchErr } = await sb.auth.exchangeCodeForSession(fullUrl);

        if (exchErr) {
          // Fallback for older SDKs that expect { code }
          const code = sp.get("code") || "";

          if (code) {
            // @ts-expect-error – some supabase-js versions accept an object arg { code }
            const { error: exchErr2 } = await sb.auth.exchangeCodeForSession({ code });
            if (exchErr2) {
              setMessage(exchErr2.message || "Failed to complete sign-in.");
              return;
            }
          } else {
            setMessage(exchErr.message || "Failed to complete sign-in.");
            return;
          }
        }

        router.replace(next);
      } catch (e: any) {
        setMessage(e?.message ?? "Something went wrong finishing sign-in.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullUrl, next, error, error_description]);

  return (
    <div className="container mx-auto max-w-md p-10">
      <div className="space-y-3">
        <div className="text-xl font-semibold">Please wait…</div>
        <p className="text-gray-400">{message}</p>
        <a className="underline" href={next}>
          Continue
        </a>
      </div>
    </div>
  );
}
