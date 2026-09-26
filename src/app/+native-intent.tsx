/**
 * Rewrites links the system opens the app with, before Expo Router matches them.
 *
 * Sign-in hands control back through redirect links (Clerk's browser flow uses
 * `clayhabit://sso-callback?...`, Google's OAuth redirect uses its own path).
 * They aren't screens, and matching them used to land on "This screen doesn't
 * exist" right after a successful sign-in. They all go home instead. Must never throw.
 */
const AUTH_REDIRECTS = /(sso-callback|oauth|oauthredirect|auth-callback|expo-auth-session)/i;

/**
 * No real ClayHabbit link comes close to these. Longer links, or links packed
 * with %-escapes, are what a crafted link uses to freeze URL parsing
 * (GHSA-vcc3-ghjq-m6fr in decode-uri-component, used by Expo Router's
 * query-string), so they never reach the router.
 */
const MAX_PATH_LENGTH = 2048;
const MAX_ESCAPES = 64;

export function isSuspiciousPath(path: string): boolean {
  if (path.length > MAX_PATH_LENGTH) return true;
  let escapes = 0;
  for (let index = path.indexOf('%'); index !== -1; index = path.indexOf('%', index + 1)) {
    if (++escapes > MAX_ESCAPES) return true;
  }
  return false;
}

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  try {
    if (!path || AUTH_REDIRECTS.test(path) || isSuspiciousPath(path)) return '/';
    return path;
  } catch {
    return '/';
  }
}
