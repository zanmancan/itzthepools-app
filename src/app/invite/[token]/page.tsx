// src/app/invite/[token]/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

type Props = {
  params: { token: string };
  searchParams?: { do?: "accept" | "decline" };
};

export default async function InvitePage({ params, searchParams }: Props) {
  const token = params.token;
  const sb = supabaseServer();
  const { data: s } = await sb.auth.getSession();

  // Handle explicit actions only after the user is signed in.
  if (s.session && searchParams?.do === "accept") {
    const leagueId = await acceptInvite(token);
    redirect(`/league/${leagueId}`);
  }
  if (s.session && searchParams?.do === "decline") {
    // Optional: tell backend we declined; ignore failures and move on.
    await declineInviteSilently(token);
    redirect("/dashboard");
  }

  // If signed in, show the review card (no auto acceptance).
  if (s.session) {
    const meta = await getInviteMeta(token);
    return <SignedInReview token={token} meta={meta} />;
  }

  // Not signed in → show the auth entry points. After auth, we’ll come back
  // to this page and THEN the user can choose Accept/Decline.
  return <SignedOutLanding token={token} />;
}

/* ------------------------- helpers (server) ------------------------- */

async function getInviteMeta(token: string): Promise<{
  leagueName?: string;
  inviterEmail?: string;
}> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/invites/open?token=${encodeURIComponent(
        token
      )}`,
      { cache: "no-store" }
    );
    if (!res.ok) return {};
    return (await res.json()) as any;
  } catch {
    return {};
  }
}

async function acceptInvite(token: string): Promise<string> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/invites/accept`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(msg || "Failed to accept invite");
  }
  const data = (await res.json()) as { leagueId: string };
  return data.leagueId;
}

async function declineInviteSilently(token: string) {
  try {
    await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/invites/decline`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
        cache: "no-store",
      }
    );
  } catch {
    // no-op
  }
}

/* ------------------------- UI components ------------------------- */

function SignedOutLanding({ token }: { token: string }) {
  const returnHere = `/invite/${token}`; // no auto-accept; user chooses next
  return (
    <div className="container mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-3xl font-semibold">You’re invited! 🎉</h1>
      <p>You’ve been invited to join a league. Please sign in or create an account to review and respond.</p>

      <div className="space-y-3">
        <Link
          className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
          href={`/login?next=${encodeURIComponent(returnHere)}`}
        >
          Sign in
        </Link>
        <div className="text-sm text-gray-400">
          New here?{" "}
          <Link className="underline" href={`/signup?next=${encodeURIComponent(returnHere)}`}>
            Create an account
          </Link>
        </div>
      </div>

      {/* Optional: keep magic-link & 6-digit code entry for convenience */}
      <MagicBlock nextUrl={returnHere} />
    </div>
  );
}

function SignedInReview({
  token,
  meta,
}: {
  token: string;
  meta: { leagueName?: string; inviterEmail?: string };
}) {
  return (
    <div className="container mx-auto max-w-xl p-8 space-y-6">
      <h1 className="text-3xl font-semibold">League invite</h1>
      <div className="rounded border border-gray-700 p-4">
        <div className="text-sm text-gray-400">League</div>
        <div className="text-lg">{meta.leagueName || "League"}</div>
        {meta.inviterEmail && (
          <div className="mt-2 text-sm text-gray-400">
            Invited by {meta.inviterEmail}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-300">
        Review the league details and choose an option below.
      </p>

      <div className="flex items-center gap-3">
        <Link
          href={`/invite/${token}?do=accept`}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Accept invite
        </Link>
        <Link
          href={`/invite/${token}?do=decline`}
          className="rounded border border-gray-600 px-4 py-2 hover:bg-gray-900"
        >
          Decline
        </Link>
      </div>

      <div className="text-sm text-gray-500">
        Changed your mind? You can return to your{" "}
        <Link className="underline" href="/dashboard">
          dashboard
        </Link>
        .
      </div>
    </div>
  );
}

/**
 * A tiny client-side magic-link + 6-digit code block that returns to `nextUrl`.
 * Users still land back here to explicitly Accept/Decline.
 */
function MagicBlock({ nextUrl }: { nextUrl: string }) {
  return (
    <script
      type="module"
      dangerouslySetInnerHTML={{
        __html: `
import { createClient } from "@supabase/supabase-js";

const root = document.currentScript.parentElement || document.body;
const html = \`
  <div class="space-y-2">
    <h2 class="font-semibold mt-6">Or continue with a magic link</h2>
    <form id="magicForm" class="space-y-2">
      <input type="email" required placeholder="your@email.com"
        class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm" />
      <button type="submit"
        class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">Send magic link</button>
    </form>
    <details class="mt-2">
      <summary class="cursor-pointer text-sm underline">I have a 6-digit code</summary>
      <form id="otpForm" class="mt-2 space-y-2">
        <input inputmode="numeric" pattern="\\\\d{6}" minlength="6" maxlength="6" required
          placeholder="123456"
          class="w-full rounded border border-gray-700 bg-black px-3 py-2 text-sm" />
        <button type="submit"
          class="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">Verify code</button>
      </form>
    </details>
  </div>
\`;
root.insertAdjacentHTML("beforeend", html);

const sb = createClient("${process.env.NEXT_PUBLIC_SUPABASE_URL}", "${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}");
const magicForm = root.querySelector("#magicForm");
const otpForm = root.querySelector("#otpForm");
const emailInput = magicForm.querySelector("input[type=email]");

const callback = ${JSON.stringify(
  (process.env.NEXT_PUBLIC_BASE_URL || "") + "/auth/callback"
)} + "?next=" + encodeURIComponent(${JSON.stringify(nextUrl)});

magicForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  if (!email) return;
  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: callback }
  });
  alert(error ? ("Error: " + error.message) : "Check your email for a magic link.");
});

otpForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const token = otpForm.querySelector("input").value.trim();
  const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    alert("Invalid code: " + error.message);
    return;
  }
  window.location.replace(${JSON.stringify(nextUrl)});
});
        `,
      }}
    />
  );
}
