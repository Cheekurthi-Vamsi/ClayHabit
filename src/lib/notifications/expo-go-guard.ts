import Constants, { AppOwnership } from 'expo-constants';
import { Platform } from 'react-native';

/**
 * `expo-notifications` throws as soon as it's `require()`'d — not merely
 * when a push-specific function is called — when running inside Expo Go
 * on Android (Expo Go SDK 53+ dropped Android push support entirely).
 * Custom expo-dev-client builds are unaffected, which is why this checks
 * the deprecated-but-still-accurate `appOwnership` (Expo Go specifically)
 * rather than `executionEnvironment` (which also covers dev-client builds
 * where notifications work fine).
 */
export const notificationsUnsupported =
  Platform.OS === 'android' && Constants.appOwnership === AppOwnership.Expo;
