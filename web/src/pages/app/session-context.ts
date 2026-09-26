import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

import { CloudSession, type SessionSnapshot } from '../../lib/cloud-session';

export const SessionContext = createContext<CloudSession | null>(null);

export function useCloudSession(): CloudSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useCloudSession needs <SessionContext.Provider>');
  return session;
}

export function useSessionSnapshot(): SessionSnapshot {
  const session = useCloudSession();
  return useSyncExternalStore(session.subscribe, session.getSnapshot);
}

/** Preferences that came from the phone (e.g. the display name). */
export function usePhonePrefs(): Record<string, unknown> {
  return useSessionSnapshot().prefs;
}

/**
 * This account's session for as long as the page shows it. It's created inside
 * the effect, not in render: React's development mode mounts, unmounts and
 * mounts again, and a session disposed by that first unmount would unlock and
 * restore fine but never save again. Each mount gets its own live session.
 */
export function useAccountSession(userId: string): CloudSession | null {
  const [session, setSession] = useState<CloudSession | null>(null);
  useEffect(() => {
    const created = new CloudSession(userId);
    setSession(created);
    return () => {
      created.dispose();
      setSession((current) => (current === created ? null : current));
    };
  }, [userId]);
  return session;
}
