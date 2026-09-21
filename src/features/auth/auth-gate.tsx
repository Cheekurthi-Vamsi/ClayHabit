import { useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/expo';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DATABASE_NAME } from '@/data/db/migrate';
import { getLastUser, rememberLastUser, resolveDatabaseForUser } from '@/lib/auth/account-database';
import { authEnabled } from '@/lib/auth/config';
import { queryClient } from '@/lib/query-client';
import { useAppTheme } from '@/theme';

import { AccountContext } from './account-context';
import { AuthScreen } from './auth-screen';

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
  if (activeUserId === null) return <AuthScreen />;
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
      {children(database.name)}
    </AccountContext.Provider>
  );
}

/**
 * Decides which database the app opens. Without Clerk configured it is always
 * the local one; with Clerk it is the signed-in account's, and a signed-out
 * person sees the sign-in screen instead of the app.
 */
export function AuthGate({ children }: { children: RenderApp }) {
  if (!authEnabled) return <>{children(DATABASE_NAME)}</>;
  return <ClerkGate>{children}</ClerkGate>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
