// src/lib/invites/types.ts
export type AcceptInviteRequest = { token: string; teamName: string };

export type ApiOk<T = unknown> = { ok: true } & T;
export type ApiErr = { ok: false; code: string; message?: string };

export type AcceptInviteResponse =
  | ApiOk<{ membershipId: string; leagueId: string; teamName: string }>
  | ApiErr;

export type InviteContext =
  | ApiOk<{
      leagueId: string;
      leagueName: string;
      token: string;
      expiresAt: number;
      consumedAt: number | null;
    }>
  | ApiErr;
