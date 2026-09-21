import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (preference) => set({ themePreference: preference }),
      appLockEnabled: false,
      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
      biometricEnabled: false,
      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
    }),
    {
      name: 'clayhabit.settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * `persist` rehydrates from AsyncStorage asynchronously, so a value like
 * `appLockEnabled` briefly reads as its default (false) on cold start. Gate
 * anything that must never render a stale default (the app-lock check in
 * particular) on this instead of assuming the store is ready immediately.
 */
export function useSettingsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}
