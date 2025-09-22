'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // After Supabase verifies the email, send the user back to the
    // invite we stored right before starting auth (or to /dashboard).
    let next = '/dashboard';
    try {
      const raw = localStorage.getItem('pending_invite');
      if (raw) {
        const v = JSON.parse(raw) as { token?: string; variant?: 'invite' | 'public' };
        if (v?.token) {
          next =
            v.variant === 'public'
              ? `/join/public?token=${encodeURIComponent(v.token)}`
              : `/join/invite?token=${encodeURIComponent(v.token)}`;
        }
      }
    } catch {}
    try { localStorage.removeItem('pending_invite'); } catch {}

    router.replace(next);
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 text-center text-gray-300">
      Finishing sign-in…
    </div>
  );
}
