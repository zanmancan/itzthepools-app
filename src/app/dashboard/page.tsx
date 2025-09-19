"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-client";
import AuthGate from "@/components/AuthGate";
import { useToast } from "@/components/Toast";
import ProfileCard from "@/components/ProfileCard";
import LeagueTeamNameForm from "@/components/LeagueTeamNameForm";
import PendingInviteBanner from "@/components/PendingInviteBanner";
import ActiveInvitesList from "@/components/ActiveInvitesList";

type League = {
  id: string;
  name: string;
  ruleset: string;
  season: string;
  is_public?: boolean;
};

function Inner() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New League form state
  const [leagueName, setLeagueName] = useState("");
  const [ruleset, setRuleset] = useState("march_madness");
  const [season, setSeason] = useState("2026");
  const [isPublic, setIsPublic] = useState(false);
  const [maxMembers, setMaxMembers] = useState<number | "">("");
  const [defaultInviteExpiresDays, setDefaultInviteExpiresDays] = useState<number | "">("");
  const [defaultInviteMaxUses, setDefaultInviteMaxUses] = useState<number | "">("");

  // live league-name availability
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const nameCheckTimer = useRef<number | null>(null);

  const { addToast } = useToast();
  const router = useRouter();

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("leagues")
      .select("id,name,ruleset,season,is_public")
      .order("created_at", { ascending: false });

    if (error) setError(error.message);
    else setLeagues(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  // Debounced league-name check
  useEffect(() => {
    if (nameCheckTimer.current) window.clearTimeout(nameCheckTimer.current);
    const name = leagueName.trim();
    if (!name) {
      setNameAvailable(null);
      return;
    }
    setCheckingName(true);
    nameCheckTimer.current = window.setTimeout(async () => {
      try {
        const scope = "global"; // or "perRuleset"
        const qs =
          scope === "global"
            ? `?name=${encodeURIComponent(name)}&scope=global`
            : `?name=${encodeURIComponent(name)}&scope=perRuleset&ruleset=${encodeURIComponent(
                ruleset
              )}&season=${encodeURIComponent(season)}`;
        const res = await fetch(`/api/league-name${qs}`);
        const json = await res.json();
        setNameAvailable(!!json.available);
      } catch {
        setNameAvailable(null);
      } finally {
        setCheckingName(false);
      }
    }, 450) as unknown as number;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leagueName, ruleset, season]);

  // Create league
  async function createLeague() {
    setError(null);
    const nm = leagueName.trim();

    if (!nm) return addToast("League Name is required.", "error");
    if (!ruleset) return addToast("Ruleset is required.", "error");
    if (!season) return addToast("Season is required.", "error");

    const mm = Number(maxMembers);
    if (!Number.isFinite(mm) || mm < 1 || mm > 1000) {
      return addToast("Max Members must be between 1 and 1000.", "error");
    }

    const exp = Number(defaultInviteExpiresDays);
    if (!Number.isFinite(exp) || exp < 1) {
      return addToast("Default invite expiry must be at least 1 day.", "error");
    }

    const mus = Number(defaultInviteMaxUses);
    if (!Number.isFinite(mus) || mus < 1) {
      return addToast("Max Signups per Invite Link must be at least 1.", "error");
    }

    if (nameAvailable === false) {
      return addToast("That League Name is already taken.", "error");
    }

    try {
      const res = await fetch("/api/leagues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nm,
          ruleset,
          season,
          isPublic,
          maxMembers: mm,
          defaultInviteExpiresDays: exp,
          defaultInviteMaxUses: mus,
        }),
      });
      if (!res.ok) {
        const msg = await res.text();
        setError(msg);
        addToast(`Create failed: ${msg}`, "error");
        return;
      }

      // reset form
      setLeagueName("");
      setIsPublic(false);
      setMaxMembers("");
      setDefaultInviteExpiresDays("");
      setDefaultInviteMaxUses("");

      addToast("League created!", "success");
      router.refresh();
      await load();
    } catch (e: any) {
      const msg = e?.message ?? "Unknown error";
      setError(msg);
      addToast(`Create failed: ${msg}`, "error");
    }
  }

  return (
    <div className="space-y-6">
      <PendingInviteBanner onAccepted={() => router.refresh()} />
      <ProfileCard />

      {/* My Leagues */}
      <div className="card">
        <div className="h1">My Leagues</div>
        {loading && <p className="opacity-70 mt-2">Loading…</p>}
        {error && <p className="text-red-400 mt-2">{error}</p>}
        {!loading && leagues.length === 0 && <p className="opacity-70 mt-2">No leagues yet.</p>}

        <div className="mt-4 grid gap-3">
          {leagues.map((l) => (
            <div key={l.id} className="card">
              <div className="text-lg font-medium">{l.name}</div>
              <div className="opacity-70">
                {l.ruleset} — {l.season}
              </div>

              <div className="mt-3">
                <LeagueTeamNameForm leagueId={l.id} onUpdated={() => router.refresh()} />
              </div>

              {/* Active invites (create + list, collapsible) */}
              <ActiveInvitesList leagueId={l.id} />
            </div>
          ))}
        </div>
      </div>

      {/* New League */}
      <div className="card max-w-3xl">
        <div className="h1 mb-3">New League</div>

        <label className="block mb-3">
          <div className="mb-1 opacity-70">League Name</div>
          <input
            className="input"
            value={leagueName}
            onChange={(e) => setLeagueName(e.target.value)}
            placeholder="e.g. Zandy Family Pool"
            required
          />
          {leagueName.trim() ? (
            <div className="mt-1 text-sm">
              {checkingName && <span className="opacity-70">Checking…</span>}
              {!checkingName && nameAvailable === true && (
                <span className="text-emerald-400">Looks good.</span>
              )}
              {!checkingName && nameAvailable === false && (
                <span className="text-red-400">That name is already taken.</span>
              )}
            </div>
          ) : null}
        </label>

        <div className="grid md:grid-cols-3 gap-3">
          <label className="block">
            <div className="mb-1 opacity-70">Ruleset</div>
            <select
              className="input"
              value={ruleset}
              onChange={(e) => setRuleset(e.target.value)}
              required
            >
              <option value="march_madness">March Madness</option>
              <option value="nfl_pool">NFL Pool</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1 opacity-70">Season</div>
            <input
              className="input"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              placeholder="2026"
              required
            />
          </label>

          <label className="block">
            <div className="mb-1 opacity-70">Visibility</div>
            <select
              className="input"
              value={isPublic ? "public" : "private"}
              onChange={(e) => setIsPublic(e.target.value === "public")}
              required
            >
              <option value="private">Private (invite only)</option>
              <option value="public">Public (shareable link)</option>
            </select>
          </label>
        </div>

        <div className="grid md:grid-cols-3 gap-3 mt-3">
          <label className="block">
            <div className="mb-1 opacity-70">Max Members</div>
            <input
              className="input"
              type="number"
              min={1}
              max={1000}
              placeholder="1–1000"
              value={maxMembers}
              onChange={(e) =>
                setMaxMembers(e.target.value === "" ? "" : Number(e.target.value))
              }
              required
            />
          </label>

          <label className="block">
            <div className="mb-1 opacity-70">Default invite expiry (days)</div>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="e.g. 7"
              value={defaultInviteExpiresDays}
              onChange={(e) =>
                setDefaultInviteExpiresDays(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              required
            />
            <div className="mt-1 text-xs opacity-70">
              We’ll add per-invite absolute date/time next.
            </div>
          </label>

          <label className="block">
            <div className="mb-1 opacity-70">Max Signups per Invite Link</div>
            <input
              className="input"
              type="number"
              min={1}
              placeholder="e.g. 1"
              value={defaultInviteMaxUses}
              onChange={(e) =>
                setDefaultInviteMaxUses(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              required
            />
          </label>
        </div>

        <button className="btn mt-4" onClick={createLeague}>
          Create
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Inner />
    </AuthGate>
  );
}
