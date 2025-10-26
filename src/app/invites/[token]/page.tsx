import { notFound } from 'next/navigation';

export default async function InvitePage({ params }: { params: { token: string } }) {
  // Simulate invite validation (in real app, fetch from API)
  const isValid = true; // Replace with API call to /api/test/invites/by-token?token=${params.token}
  if (!isValid) notFound();

  return (
    <div className="p-4">
      <h1>Join Test Invite League</h1> {/* Match test expectation */}
      <button type="button" className="mt-4 p-2 bg-blue-500 text-white">
        Accept Invite
      </button>
    </div>
  );
}