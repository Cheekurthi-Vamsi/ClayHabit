import { Platform } from 'react-native';

/**
 * Cloud (Google Drive) turns on when the Google OAuth client IDs are set in
 * `.env.local`:
 *
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=…apps.googleusercontent.com   (both platforms)
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=…apps.googleusercontent.com   (iOS only)
 *
 * Android also needs an "Android" OAuth client in the same Google Cloud
 * project, registered with the app's package name and signing SHA-1; that
 * one isn't referenced from code. Client IDs are public identifiers, not
 * secrets. Without them the app keeps working on this device only, which
 * keeps tests, Expo Go and fresh clones running.
 */
export const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
export const GOOGLE_IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';

/** Only the app's own hidden folder in Drive — not the person's files. */
export const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

const CLIENT_ID = /^[\w-]+\.apps\.googleusercontent\.com$/;

export const cloudConfigured =
  CLIENT_ID.test(GOOGLE_WEB_CLIENT_ID) && (Platform.OS !== 'ios' || CLIENT_ID.test(GOOGLE_IOS_CLIENT_ID));
