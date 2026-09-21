import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';

import { UnlockScreen } from './unlock-screen';

export function AppLockGate({ children }: { children: React.ReactNode }) {
  const appLockEnabled = useSettingsStore((state) => state.appLockEnabled);
  const isSessionUnlocked = useAppLockStore((state) => state.isSessionUnlocked);
  const setSessionUnlocked = useAppLockStore((state) => state.setSessionUnlocked);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        setSessionUnlocked(false);
      }
    });
    return () => subscription.remove();
  }, [setSessionUnlocked]);

  const locked = appLockEnabled && !isSessionUnlocked;

  if (locked) {
    return <UnlockScreen />;
  }

  return <>{children}</>;
}
