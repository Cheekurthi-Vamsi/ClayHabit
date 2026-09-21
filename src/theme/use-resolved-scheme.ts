import { useColorScheme } from 'react-native';

import { useSettingsStore } from '@/store/settings-store';

export function useResolvedScheme(): 'light' | 'dark' {
  const systemScheme = useColorScheme();
  const themePreference = useSettingsStore((state) => state.themePreference);
  return themePreference === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : themePreference;
}
