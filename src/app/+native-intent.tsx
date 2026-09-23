/**
 * Rewrites links the system opens the app with, before Expo Router matches them.
 *
 * Sign-in hands control back through redirect links (Clerk's browser flow uses
 * `clayhabit://sso-callback?...`, Google's OAuth redirect uses its own path).
 * They aren't screens, and matching them used to land on "This screen doesn't
 * exist" right after a successful sign-in. They all go home instead. Must never throw.
 */
const AUTH_REDIRECTS = /(sso-callback|oauth|oauthredirect|auth-callback|expo-auth-session)/i;

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (!path || AUTH_REDIRECTS.test(path)) return '/';
    return path;
  } catch {
    return '/';
  }
}
