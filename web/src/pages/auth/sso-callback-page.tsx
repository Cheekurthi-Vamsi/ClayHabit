import { AuthenticateWithRedirectCallback } from '@clerk/react';

import { Spinner } from '../../components/ui';

/** Where Google sends the browser back after sign-in; Clerk finishes the session and goes on to the app. */
export function SsoCallbackPage() {
  return (
    <main className="gate">
      <div className="gate__center">
        <Spinner label="Signing you in" />
        <p className="t-title-md c-secondary">Signing you in…</p>
      </div>
      <AuthenticateWithRedirectCallback signInFallbackRedirectUrl="/app" signUpFallbackRedirectUrl="/app" />
    </main>
  );
}
