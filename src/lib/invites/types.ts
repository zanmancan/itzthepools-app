/**
 * Canonical types used by the public invites API.
 * Keep these tiny and aligned with what the API returns today.
 */

export type AcceptInviteBody = {
  /** The invite token the user is accepting. */
  token: string;
  /** Team / league name the user is providing on accept. */
  teamName: string;
};

export type AcceptInviteResult = {
  ok: boolean;
  /** League id the user joined (when available). */
  league_id?: string;
  /** Present when ok === false. */
  error?: string;
};

/** Response shape used by GET /api/invites/info?token=... */
export type InviteInfoResponse = {
  ok: boolean;
  league_id?: string;
  league_name?: string;
  email?: string;
  used?: boolean;
  revoked?: boolean;
  expires_at?: string; // ISO string
  error?: string;
};

/** Dev/test-only: response from /api/test/invites/seed */
export type SeedInviteResponse = {
  ok: boolean;
  leagueId?: string;
  leagueName?: string;
  invite?: {
    id: string;
    token: string;
    email: string;
    league_id: string;
    created_at: string; // ISO
    expires_at: string; // ISO
    is_public: boolean;
    used: boolean;
    revoked: boolean;
  };
  /** Convenient relative URL like /test/invite/<token> */
  inviteUrl?: string;
  error?: string;
};
