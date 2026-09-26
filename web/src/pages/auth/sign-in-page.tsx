import { useAuth, useClerk } from '@clerk/react';
import { ArrowLeft, HardDrive, KeyRound, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';

import artDark from '@/assets/images/onboarding/auth-dark.jpg';
import artLight from '@/assets/images/onboarding/auth-light.jpg';

import { Brand, Chip, GoogleButton, ThemeToggle } from '../../components/ui';
import { useTheme } from '../../lib/theme';
import { useDocumentTitle } from '../../lib/use-document-title';

/**
 * Sign in, like the phone's auth screen: the quote art on one side, one
 * "Continue with Google" on the other. Google proves who you are, Clerk keeps
 * the session — the same account as the phone, so the same data.
 */
export function SignInPage() {
  useDocumentTitle('Sign in — ClayHabbit');
  const clerk = useClerk();
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/app', { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  const continueWithGoogle = async () => {
    setBusy(true);
    setError(null);
    try {
      const signIn = clerk.client?.signIn;
      if (!signIn) throw new Error("Couldn't reach the sign-in service. Check your connection and try again.");
      await signIn.authenticateWithRedirect({
        strategy: 'oauth_google',
        redirectUrl: `${window.location.origin}/sso-callback`,
        redirectUrlComplete: `${window.location.origin}/app`,
      });
    } catch (cause) {
      setBusy(false);
      setError(cause instanceof Error ? cause.message : 'Google sign-in didn’t start. Please try again.');
    }
  };

  return (
    <main className="auth">
      <div className="auth__art">
        <img
          src={theme === 'dark' ? artDark : artLight}
          width={720}
          height={1280}
          alt="The best algorithm ever written is a book."
          decoding="async"
        />
        <div className="auth__art-caption">
          <Chip icon={<Lock size={14} />}>End-to-end encrypted</Chip>
          <Chip icon={<HardDrive size={14} />}>Stored in your Drive</Chip>
        </div>
      </div>

      <div className="auth__panel">
        <div className="auth__top">
          <Link to="/landing" className="btn btn--ghost btn--sm" style={{ paddingLeft: 8 }}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </Link>
          <ThemeToggle />
        </div>

        <div className="auth__card">
          <Brand size={26} mono />
          <div style={{ display: 'grid', gap: 8 }}>
            <h1 className="t-display-md">Welcome to ClayHabbit</h1>
            <p className="t-body-lg c-secondary">Your habits, tasks, notes and money in one calm place.</p>
          </div>

          <GoogleButton busy={busy || !isLoaded} busyLabel={isLoaded ? 'Opening Google…' : 'Getting ready…'} onClick={continueWithGoogle} />
          <p className="field__error" role="alert">
            {error ?? ''}
          </p>

          <ul className="auth__trust" style={{ listStyle: 'none', margin: 0 }}>
            <li>
              <KeyRound size={18} />
              <span>No new password. Next, your data passcode unlocks your encrypted space.</span>
            </li>
            <li>
              <HardDrive size={18} />
              <span>Your data lives in your own Google Drive, in a private folder only ClayHabbit can open.</span>
            </li>
            <li>
              <Lock size={18} />
              <span>ClayHabbit only receives your name, email and photo from Google.</span>
            </li>
          </ul>
        </div>

        <p className="auth__foot">Same account as the ClayHabbit phone app — sign in with the Google account you use there.</p>
      </div>
    </main>
  );
}
