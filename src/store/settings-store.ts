import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      themePreference: 'system',
      setThemePreference: (preference) => set({ themePreference: preference }),
    }),
    {
      name: 'clayhabit.settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
