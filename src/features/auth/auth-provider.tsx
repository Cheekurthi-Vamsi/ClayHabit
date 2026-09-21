import { ClerkProvider } from '@clerk/expo';
import { resourceCache } from '@clerk/expo/resource-cache';
import { tokenCache } from '@clerk/expo/token-cache';

import { authEnabled, CLERK_PUBLISHABLE_KEY } from '@/lib/auth/config';

/**
 * Clerk, when a publishable key is configured. The session token lives in the
 * Keychain / Keystore via expo-secure-store (`tokenCache`), and the resource
 * cache lets Clerk boot from its last known state when there's no network.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!authEnabled) return <>{children}</>;

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
      __experimental_resourceCache={resourceCache}
    >
      {children}
    </ClerkProvider>
  );
}
