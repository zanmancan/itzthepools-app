// src/app/signup/page.tsx
import { Suspense } from 'react';
import SignupClient from './SignupClient';

export const dynamic = 'force-dynamic'; // don’t try to SSG this page

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto max-w-lg p-6 text-sm text-gray-400">Loading…</div>
      }
    >
      <SignupClient />
    </Suspense>
  );
}
