/** Shared with the phone app: the root .env.local (see vite.config.ts `envDir`). */
export const CLERK_PUBLISHABLE_KEY = import.meta.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';
export const GOOGLE_WEB_CLIENT_ID = import.meta.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';

if (!CLERK_PUBLISHABLE_KEY) {
  console.warn('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not set in the root .env.local; sign-in will not work.');
}

/** Where the Android app is published (GitHub Releases on the public repo). */
export const GITHUB_REPO = 'Cheekurthi-Vamsi/ClayHabit';
export const RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;
/**
 * Always the newest APK: every release attaches it under this same file name,
 * and GitHub redirects `latest/download/<name>` to the newest release's copy.
 */
export const APK_URL = `${RELEASES_URL}/latest/download/ClayHabbit.apk`;
/** Questions, bug reports and privacy requests. */
export const SUPPORT_URL = `https://github.com/${GITHUB_REPO}/issues`;
