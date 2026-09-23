import * as ExpoHaptics from 'expo-haptics';

import { useSettingsStore } from '@/store/settings-store';

/**
 * expo-haptics with the same API, gated on Settings → Haptic feedback.
 * Import this (`import * as Haptics from '@/lib/haptics'`) rather than
 * expo-haptics directly, so the setting applies everywhere.
 */
export { ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

function enabled(): boolean {
  return useSettingsStore.getState().hapticsEnabled;
}

export function selectionAsync(): Promise<void> {
  return enabled() ? ExpoHaptics.selectionAsync() : Promise.resolve();
}

export function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle): Promise<void> {
  return enabled() ? ExpoHaptics.impactAsync(style) : Promise.resolve();
}

export function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType): Promise<void> {
  return enabled() ? ExpoHaptics.notificationAsync(type) : Promise.resolve();
}
