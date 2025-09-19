"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/components/Toast";
import Avatar from "@/components/Avatar";

const MIN = 2;
const MAX = 24;
// Letters, numbers, spaces, underscore, dash; must start/end with a letter/number
const NAME_RE = /^[A-Za-z0-9](?:[A-Za-z0-9 _-]*[A-Za-z0-9])?$/;

function collapse(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

/**
 * ProfileCard
 * - Shows email (read-only), display name (editable), and avatar (upload/remove)
 * - Debounced global uniqueness check for display name (via RPC)
 * - Lets user send a password reset email which lands on /auth/reset
 */
export default function ProfileCard() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);

  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string>("");

  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [lastResetTs, setLastResetTs] = useState<number | null>(null);

  // availability state for display name
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const checkSeq = useRef(0);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // Derived/validated display name
  const cleaned = useMemo(() => collapse(displayName), [displayName]);
  const validBasic =
    cleaned.length >= MIN && cleaned.length <= MAX && NAME_RE.test(cleaned);

  // Load session user + profile
  useEffect(() => {
    // mark async IIFE as intentionally not awaited
    void (async () => {
      setLoading(true);
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        setLoading(false);
        return;
      }
      const user = userRes.user;
      setUid(user.id);
      setEmail(user.email ?? "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .single();

      if (error && (error as any).code !== "PGRST116") {
        addToast(`Failed to load profile: ${error.message}`, "error");
      } else {
        const dn = profile?.display_name ?? "";
        setDisplayName(dn);
        setAvatarUrl(profile?.avatar_url ?? null);
        // Your current name is always "available" to you
        setAvailable(true);
      }

      setLoading(false);
    })();
  }, [addToast]);

  // Debounced availability check while typing
  useEffect(() => {
    // If invalid or unchanged, don't check
    if (!validBasic) {
      setAvailable(null);
      setChecking(false);
      return;
    }

    const my = ++checkSeq.current;
    setChecking(true);

    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc("is_display_name_available", {
          p_name: cleaned,
        });
        if (checkSeq.current !== my) return; // newer check in flight
        if (error) {
          // keep UI permissive on RPC failure
          setAvailable(null);
        } else {
          setAvailable(!!data);
        }
      } finally {
        if (checkSeq.current === my) setChecking(false);
      }
    }, 350);

    return () => clearTimeout(t);
  }, [cleaned, validBasic]);

  async function saveProfile() {
    if (!uid) return;

    // Prevent save if invalid or taken
    if (!validBasic) {
      addToast(
        `Display name must be ${MIN}-${MAX} chars; letters, numbers, spaces, _ or -.`,
        "error"
      );
      return;
    }
    if (available === false) {
      addToast("That display name is taken.", "error");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .upsert({ id: uid, display_name: cleaned, avatar_url: avatarUrl });

      if (error) throw error;

      setDisplayName(cleaned); // normalize field
      addToast("Profile saved!", "success");
    } catch (e: any) {
      addToast(e?.message ?? "Failed to save profile", "error");
    } finally {
      setSaving(false);
    }
  }

  function chooseFile() {
    inputRef.current?.click();
  }

  async function onFileSelected(file: File) {
    if (!uid) return;
    if (!file) return;

    // very light validation
    if (!file.type.startsWith("image/")) {
      addToast("Please choose an image file (png/jpg/webp).", "error");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      addToast("Image too large. Max 3MB.", "error");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const filename = `${Date.now()}.${ext}`;
      // Policies require first folder to be the user id
      const path = `${uid}/${filename}`;

      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { cacheControl: "3600", upsert: true });
      if (upErr) throw upErr;

      const {
        data: { publicUrl },
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: profErr } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", uid);
      if (profErr) throw profErr;

      setAvatarUrl(publicUrl);
      addToast("Avatar updated!", "success");
    } catch (e: any) {
      addToast(e?.message ?? "Upload failed", "error");
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (!uid) return;
    setUploading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", uid);
      if (error) throw error;

      setAvatarUrl(null);
      addToast("Avatar removed.", "success");
    } catch (e: any) {
      addToast(e?.message ?? "Failed to remove avatar", "error");
    } finally {
      setUploading(false);
    }
  }

  async function sendResetEmail() {
    if (!email) return;
    // prevent hammering the endpoint
    if (lastResetTs && Date.now() - lastResetTs < 60_000) {
      addToast("You can request another reset email in a minute.", "error");
      return;
    }
    setSendingReset(true);
    try {
      const redirectTo = `${window.location.origin}/auth/reset`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;
      setLastResetTs(Date.now());
      addToast("Password reset email sent. Check your inbox.", "success");
    } catch (e: any) {
      addToast(e?.message ?? "Failed to send reset email", "error");
    } finally {
      setSendingReset(false);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <div className="h1">My Profile</div>
        <p className="opacity-70 mt-2">Loading…</p>
      </div>
    );
  }

  if (!uid) {
    return (
      <div className="card">
        <div className="h1">My Profile</div>
        <p className="opacity-70 mt-2">You’re not signed in.</p>
      </div>
    );
  }

  const fallback = (displayName || email || "You").trim().slice(0, 1);

  return (
    <div className="card">
      <div className="h1 mb-3">My Profile</div>

      {/* Email (read-only) + Reset password */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="opacity-70">Email:</div>
        <div className="font-medium">{email}</div>
        <button
          className="btn"
          onClick={() => {
            void sendResetEmail();
          }}
          disabled={sendingReset}
        >
          {sendingReset ? "Sending…" : "Reset Password"}
        </button>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <Avatar src={avatarUrl ?? undefined} fallbackText={fallback || "?"} size={72} />
        <div className="flex gap-2">
          <button className="btn" onClick={chooseFile} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload Avatar"}
          </button>
          <button
            className="btn"
            onClick={() => {
              void removeAvatar();
            }}
            disabled={uploading || !avatarUrl}
          >
            Remove
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onFileSelected(f);
            e.currentTarget.value = ""; // allow choosing the same file again
          }}
        />
      </div>

      <label className="block mb-1 max-w-md">
        <div className="mb-1 opacity-70">Display Name</div>
        <input
          className="input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="e.g. Zandy"
          maxLength={MAX}
        />
      </label>

      {/* Status line */}
      <div className="mb-3 text-sm max-w-md">
        {!validBasic ? (
          <span className="text-red-400">
            Must be {MIN}-{MAX} chars; letters, numbers, spaces, _ or -. Can’t start or
            end with a space/symbol.
          </span>
        ) : checking ? (
          <span className="opacity-70">Checking…</span>
        ) : available === false ? (
          <span className="text-red-400">That display name is taken.</span>
        ) : available === true ? (
          <span className="text-green-400">Looks good.</span>
        ) : (
          <span className="opacity-70"> </span>
        )}
      </div>

      <button
        className="btn"
        onClick={() => {
          void saveProfile();
        }}
        disabled={saving || !validBasic || available === false}
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}
