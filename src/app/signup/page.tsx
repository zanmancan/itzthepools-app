import { Suspense } from "react";
import SignupClient from "./SignupClient";

// Wrap useSearchParams() (inside SignupClient) with Suspense to silence the
// "/signup should be wrapped in a suspense boundary" prerender warning.
export default function Page() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}
