// src/app/join/invite/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";

// Tell Next this page is dynamic (no pre-render)
export const dynamic = "force-dynamic";

type InviteInfo = {
  id: string;
  is_public: boolean | null;
  email: string | null;
  expires_at: string | null;
  league_id: string;
  league_name: string | null;
  league_season: string | null;
};

type ToastFn = (opts: {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
}) => void;

/** Outer page: only responsible for putting a Suspense boundary around inner content. */
export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto px-4 py-10">
          <h1 className="text-2xl font-semibold mb-6">Join League</h1>
          <div className="rounded-xl border border-zinc-700 p-6">
            <p className="text-sm text-zinc-400">Loading…</p>
          </div>
        </div>
      }
    >
      <JoinInviteInner />
    </Suspense>
  );
}

/** All logic lives in the inner component (wrapped by Suspense so useSearchParams is safe). */
function JoinInviteInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Normalize toast (and memoize to keep effect deps stable)
  const ctx = useToast() as any;
  const toast: ToastFn = useMemo(
    () => (ctx && typeof ctx.toast === "function" ? ctx.toast : () => {}),
    [ctx]
  );

  const token = params.get("token") ?? "";

  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteInfo | null>(null);

  // Sign-in form state
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  // Accept UI state
  const [teamName, setTeamName] = useState("");
  const [accepting, setAccepting] = useState(false);

  const thisPageUrl = useMemo(() => {
    if (typeof window === "undefined") return "/join/invite";
    const u = new URL(window.location.href);
    return `${u.pathname}${u.search}`;
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) Auth status
        const { data: auth } = await supabase.auth.getUser();
        if (!mounted) return;
        setUserId(auth.user?.id ?? null);

        // 2) Invite details (works when signed out too)
        const resp = await fetch(`/api/invites/info?token=${encodeURIComponent(token)}`);
        if (!mounted) return;

        if (!resp.ok) setInvite(null);
        else {
          const payload = (await resp.json()) as { invite?: InviteInfo | null };
          setInvite(payload?.invite ?? null);
        }
      } catch (err: any) {
        console.error(err);
        toast({
          title: "Error",
          description: err?.message ?? "Failed to load invite",
          variant: "destructive",
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token, toast]);

  // --- AUTH ACTIONS ---------------------------------------------------------

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pw,
      });
      if (error) throw error;

      toast({ title: "Signed in", description: "Welcome back!" });

      const { data } = await supabase.auth.getUser();
      setUserId(data.user?.id ?? null);
    } catch (err: any) {
      toast({
        title: "Sign-in failed",
        description: err?.message ?? "Check your email/password.",
        variant: "destructive",
      });
    }
  }

  async function createAccountMagic(e: React.FormEvent) {
    e.preventDefault();
    const emailAddr = email.trim();
    if (!emailAddr) {
      toast({ title: "Email required", description: "Enter an email to continue." });
      return;
    }

    try {
      // Short-lived cookie fallback (15 min)
      document.cookie = `next_after_auth=${encodeURIComponent(
        thisPageUrl
      )}; Path=/; Max-Age=900; SameSite=Lax`;

      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        thisPageUrl
      )}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: emailAddr,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) throw error;

      toast({
        title: "Check your email",
        description: "We sent you a magic link to finish creating your account.",
      });
    } catch (err: any) {
      toast({
        title: "Couldn’t send magic link",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    }
  }

  // --- ACCEPT / DECLINE -----------------------------------------------------

  async function doAcceptInvite() {
    setAccepting(true);
    try {
      const body = { token, teamName };
      const resp = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Invite acceptance failed.");

      const leagueId =
        json?.league_id ?? json?.league?.id ?? invite?.league_id ?? "";

      toast({
        title: "Welcome to the league!",
        description: invite?.league_name ?? "",
      });

      if (leagueId) router.replace(`/leagues/${leagueId}`);
      else router.replace("/dashboard");
    } catch (err: any) {
      toast({
        title: "Accept failed",
        description: err?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  }

  function declineInvite() {
    router.replace("/dashboard");
  }

  // --- RENDER ---------------------------------------------------------------

  if (!token) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Join League</h1>
        <div className="rounded-xl border border-zinc-700 p-6">
          <p className="text-red-400">Missing invite token.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold mb-6">Join League</h1>

      {/* Invite details */}
      <div className="rounded-xl border border-zinc-700 p-6 mb-6">
        <h2 className="font-medium mb-2">Invite</h2>
        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : invite ? (
          <div className="text-sm text-zinc-200 space-y-1">
            <div>League: {invite.league_name ?? "—"}</div>
            <div>Season: {invite.league_season ?? "—"}</div>
            <div>
              Expires:{" "}
              {invite.expires_at ? new Date(invite.expires_at).toLocaleString() : "—"}
            </div>
            {!!invite.email && <div>Sent to: {invite.email}</div>}
          </div>
        ) : (
          <p className="text-sm text-red-400">Invalid or expired invite.</p>
        )}
      </div>

      {/* If signed in → Accept UI; else → Auth UI */}
      {userId ? (
        <div className="rounded-xl border border-zinc-700 p-6 space-y-4">
          <h2 className="font-medium">Choose your Team Name</h2>
          <input
            type="text"
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
            placeholder="Team Name"
            value={teamName}
            maxLength={30}
            onChange={(e) => setTeamName(e.target.value)}
          />
          <div className="flex gap-3">
            {/* wrap in lambda to avoid returning a Promise to onClick */}
            <button
              onClick={() => { void doAcceptInvite(); }}
              disabled={!teamName.trim() || accepting}
              className="px-4 py-2 rounded-lg bg-white/90 text-black disabled:opacity-50"
            >
              {accepting ? "Joining…" : "Accept & Join"}
            </button>
            <button
              onClick={() => { declineInvite(); }}
              className="px-4 py-2 rounded-lg border border-zinc-600"
            >
              Decline
            </button>
          </div>
          <p className="text-xs text-zinc-400">
            Team name must be unique (2–30 chars). You can change it later, but duplicates
            aren’t allowed.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-700 p-6 space-y-6">
          <h2 className="font-medium">Sign in</h2>
          <form onSubmit={(e) => { void signIn(e); }} className="space-y-3">
            <input
              type="email"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <input
              type="password"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="current-password"
            />
            <button type="submit" className="px-4 py-2 rounded-lg bg-white/90 text-black">
              Sign in
            </button>
          </form>

          <div className="border-t border-zinc-800 my-4" />

          <h3 className="font-medium">New here?</h3>
          <form onSubmit={(e) => { void createAccountMagic(e); }} className="space-y-3">
            <input
              type="email"
              className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <button type="submit" className="px-4 py-2 rounded-lg border border-zinc-600">
              Create account (magic link)
            </button>
            <p className="text-xs text-zinc-400">
              We’ll email you a link. After you click it, you’ll land back here to accept this
              invite.
            </p>
          </form>
        </div>
      )}
    </div>
  );
}
