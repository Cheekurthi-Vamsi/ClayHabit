import { useClerk } from '@clerk/expo';
import { useSSO } from '@clerk/expo/experimental';

import { CloudError } from '@/lib/cloud/cloud-error';
import { googleSignInAvailable, signInWithGoogle } from '@/lib/cloud/google-account';

/** Why a Google sign-in didn't end in a session; `null` detail means the person backed out. */
export class GoogleAuthError extends Error {
  constructor(
    message: string,
    readonly cancelled = false,
  ) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

interface ClerkApiErrorLike {
  errors?: { code?: string; longMessage?: string; message?: string }[];
}

function firstClerkError(error: unknown) {
  const errors = (error as ClerkApiErrorLike | null)?.errors;
  return Array.isArray(errors) ? errors[0] : undefined;
}

/** Clerk said no because of how the instance is set up, not because of the person. */
function isClerkConfigError(error: unknown): boolean {
  const code = firstClerkError(error)?.code ?? '';
  return /strategy|oauth|not_allowed|client_id|token|invalid/i.test(code);
}

function missingFieldsMessage(fields: readonly string[]): string {
  return `Your Clerk app still asks for ${fields.join(', ')} after Google sign-in. In the Clerk Dashboard → User & authentication, make those optional (Google gives ClayHabbit a name and email only).`;
}

/**
 * The one way into ClayHabbit: Google.
 *
 * In the app build it uses the native Google account sheet and hands the ID
 * token to Clerk (`google_one_tap` strategy) — no browser, no redirect URL.
 * That needs Clerk's Google connection to use custom credentials whose
 * client ID is this app's web client ID. If Clerk isn't set up that way, or
 * in Expo Go (no native module), it falls back to Clerk's browser OAuth flow.
 */
export function useGoogleAuth() {
  const clerk = useClerk();
  const { startSSOFlow } = useSSO();

  async function browserFlow(): Promise<void> {
    const result = await startSSOFlow({ strategy: 'oauth_google' });
    if (result.createdSessionId) return; // useSSO finalizes the session itself.
    if (result.authSessionResult && result.authSessionResult.type !== 'success') {
      throw new GoogleAuthError('Google sign-in was cancelled.', true);
    }
    const signUp = clerk.client?.signUp;
    if (signUp?.status === 'missing_requirements' && signUp.missingFields.length) {
      throw new GoogleAuthError(missingFieldsMessage(signUp.missingFields));
    }
    throw new GoogleAuthError(
      "Google finished, but Clerk didn't start a session. In the Clerk Dashboard, allowlist the redirect URL clayhabit://sso-callback under Native applications.",
    );
  }

  async function nativeFlow(): Promise<void> {
    const { idToken } = await signInWithGoogle();
    const client = clerk.client;
    if (!client)
      throw new GoogleAuthError(
        "Couldn't reach ClayHabbit's sign-in service. Check your connection.",
      );
    const { signIn, signUp } = client;

    let sessionId: string | null = null;
    try {
      await signIn.create({ strategy: 'google_one_tap', token: idToken });
      if (signIn.firstFactorVerification.status === 'transferable') {
        // First time with this Google account: Clerk turns the sign-in into a new account.
        await signUp.create({ transfer: true });
        if (signUp.status === 'missing_requirements')
          throw new GoogleAuthError(missingFieldsMessage(signUp.missingFields));
        sessionId = signUp.createdSessionId;
      } else {
        sessionId = signIn.createdSessionId;
      }
    } catch (error) {
      if (firstClerkError(error)?.code !== 'external_account_not_found') throw error;
      await signUp.create({ strategy: 'google_one_tap', token: idToken });
      if (signUp.status === 'missing_requirements')
        throw new GoogleAuthError(missingFieldsMessage(signUp.missingFields));
      sessionId = signUp.createdSessionId;
    }

    if (!sessionId)
      throw new GoogleAuthError(
        "Clerk accepted Google but didn't start a session. Please try again.",
      );
    await clerk.setActive({ session: sessionId });
  }

  async function signInWithGoogleAccount(): Promise<void> {
    if (!googleSignInAvailable()) return browserFlow();
    try {
      await nativeFlow();
    } catch (error) {
      if (error instanceof CloudError) {
        if (error.code === 'cancelled')
          throw new GoogleAuthError('Google sign-in was cancelled.', true);
        throw new GoogleAuthError(error.message);
      }
      // Clerk's Google connection isn't set up for native ID tokens: the browser flow still works.
      if (isClerkConfigError(error)) return browserFlow();
      throw error;
    }
  }

  return { signInWithGoogleAccount };
}
