import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  /** Highest streak milestone already celebrated, so each one only fires once. */
  lastCelebratedStreak: number;
  setLastCelebratedStreak: (days: number) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Light is the flagship look; System/Dark stay one tap away in Settings.
      themePreference: 'light',
      setThemePreference: (preference) => set({ themePreference: preference }),
      displayName: '',
      setDisplayName: (name) => set({ displayName: name.trim().slice(0, 40) }),
      appLockEnabled: false,
      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
      biometricEnabled: false,
      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
      lastCelebratedStreak: 0,
      setLastCelebratedStreak: (days) => set({ lastCelebratedStreak: days }),
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
