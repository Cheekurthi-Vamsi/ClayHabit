import { useEffect, useMemo, useState } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DATABASE_NAME } from '@/data/db/migrate';
import { getLastUser, rememberLastUser, resolveDatabaseForUser } from '@/lib/auth/account-database';
import { clerkLegacyData, LegacyClerkDataContext } from '@/lib/auth/legacy-clerk-data';
import { authEnabled } from '@/lib/auth/config';
import { queryClient } from '@/lib/query-client';
import { useSettingsStore } from '@/store/settings-store';
import { useAppTheme } from '@/theme';

import { AccountContext } from './account-context';
import { AuthScreen } from './auth-screen';
import { GetStartedScreen } from './get-started-screen';

/** How long to wait for Clerk before falling back to the remembered session. */
const OFFLINE_FALLBACK_MS = 4000;

type RenderApp = (databaseName: string) => React.ReactNode;

function AuthLoading() {
  const theme = useAppTheme();
  return (
    <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

function ClerkGate({ children }: { children: RenderApp }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const [timedOut, setTimedOut] = useState(false);
  const [lastUser, setLastUser] = useState<string | null | undefined>(undefined);
  const [database, setDatabase] = useState<{ userId: string; name: string } | null>(null);
  // Clerk is sign-in only; this just lets older data kept in the account be cleaned up.
  const legacy = useMemo(() => (user ? clerkLegacyData(user) : null), [user]);

  useEffect(() => {
    getLastUser().then(setLastUser, () => setLastUser(null));
  }, []);

  useEffect(() => {
    if (isLoaded) return;
    const timer = setTimeout(() => setTimedOut(true), OFFLINE_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [isLoaded]);

  // Who is using the app right now: Clerk's answer when it has one, otherwise
  // (offline, Clerk still unreachable) the last account that signed in here.
  // `undefined` means "still finding out".
  const offline = !isLoaded && timedOut;
  const activeUserId: string | null | undefined = isLoaded
    ? isSignedIn
      ? (userId ?? null)
      : null
    : offline && lastUser !== undefined
      ? lastUser
      : undefined;

  useEffect(() => {
    if (!activeUserId) return;
    let cancelled = false;
    resolveDatabaseForUser(activeUserId)
      .then((name) => {
        if (cancelled) return;
        // Nothing cached for the previous account may leak into this one.
        queryClient.clear();
        setDatabase({ userId: activeUserId, name });
      })
      .catch(() => {
        if (!cancelled) setDatabase({ userId: activeUserId, name: DATABASE_NAME });
      });
    rememberLastUser(activeUserId).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [activeUserId]);

  if (activeUserId === undefined) return <AuthLoading />;
  if (activeUserId === null) return <SignedOut />;
  if (!database || database.userId !== activeUserId) return <AuthLoading />;

  return (
    <AccountContext.Provider
      value={{
        userId: activeUserId,
        firstName: user?.firstName ?? null,
        fullName: user?.fullName ?? null,
        email: user?.primaryEmailAddress?.emailAddress ?? null,
        imageUrl: user?.hasImage ? user.imageUrl : null,
        offline,
      }}
    >
      <LegacyClerkDataContext.Provider value={legacy}>{children(database.name)}</LegacyClerkDataContext.Provider>
    </AccountContext.Provider>
  );
}

/** Get Started once per install, then the sign-in screen. */
function SignedOut() {
  const seen = useSettingsStore((state) => state.hasSeenGetStarted);
  const setSeen = useSettingsStore((state) => state.setHasSeenGetStarted);
  return seen ? <AuthScreen /> : <GetStartedScreen onContinue={() => setSeen(true)} />;
}

/** Without sign-in configured, Get Started still greets a new install before the app opens. */
function LocalGate({ children }: { children: RenderApp }) {
  const seen = useSettingsStore((state) => state.hasSeenGetStarted);
  const setSeen = useSettingsStore((state) => state.setHasSeenGetStarted);
  if (!seen) return <GetStartedScreen onContinue={() => setSeen(true)} />;
  return <>{children(DATABASE_NAME)}</>;
}

/**
 * Decides which database the app opens. Without Clerk configured it is always
 * the local one; with Clerk it is the signed-in account's, and a signed-out
 * person sees the sign-in screen instead of the app.
 */
export function AuthGate({ children }: { children: RenderApp }) {
  if (!authEnabled) return <LocalGate>{children}</LocalGate>;
  return <ClerkGate>{children}</ClerkGate>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
