import { useEffect } from 'react';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { AppState } from 'react-native';

import { useAppLockStore } from '@/store/app-lock-store';
import { useSettingsStore } from '@/store/settings-store';

import { UnlockScreen } from './unlock-screen';

/**
 * With App Lock on, the app's screens stay private outside it too: Android
 * blanks the recent-apps preview (FLAG_SECURE), and screenshots and screen
 * recordings are blocked. Mounted only while App Lock is on.
 */
function PrivateScreens() {
  usePreventScreenCapture('app-lock');
  return null;
}

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

  return (
    <>
      {appLockEnabled ? <PrivateScreens /> : null}
      {locked ? <UnlockScreen /> : children}
    </>
  );
}
