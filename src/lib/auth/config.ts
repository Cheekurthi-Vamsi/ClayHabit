/**
 * Clerk is switched on by providing a publishable key in `.env.local`:
 *
 *   EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_…
 *
 * Without one the app runs exactly as before — local-only, no sign-in —
 * which keeps tests, previews and fresh clones working. The publishable key
 * is designed to ship inside the app; it is not a secret.
 */
export const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? '';

export const authEnabled = /^pk_(test|live)_/.test(CLERK_PUBLISHABLE_KEY);
