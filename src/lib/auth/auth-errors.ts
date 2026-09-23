/**
 * Turns whatever Clerk throws or returns into one calm sentence for the auth
 * screen. Duck-typed on purpose: Clerk's API errors carry `errors[].longMessage`
 * (user-facing) and runtime errors a `code`, and matching on shape keeps this
 * free of SDK imports and easy to test.
 */

export const OFFLINE_MESSAGE =
  "You're offline. Connect once to sign in — after that, ClayHabbit works without a connection.";

const FRIENDLY_BY_CODE: Record<string, string> = {
  form_password_incorrect: 'That password doesn’t match this account.',
  form_identifier_not_found: 'No account uses that email yet. Create one instead?',
  form_identifier_exists: 'An account already uses that email. Sign in instead?',
  form_code_incorrect: 'That code isn’t right. Check the latest email and try again.',
  verification_expired: 'That code has expired. Send a new one.',
  form_password_pwned: 'That password has appeared in a data breach. Please choose another.',
  form_password_length_too_short: 'Use a longer password — at least 8 characters.',
  too_many_requests: 'Too many attempts. Wait a moment and try again.',
};

interface ApiErrorLike {
  code?: string;
  message?: string;
  longMessage?: string;
}

function isOffline(code: string | undefined): boolean {
  return code === 'network_error' || code === 'clerk_offline';
}

export function authErrorMessage(error: unknown): string {
  if (!error) return 'Something went wrong. Please try again.';

  const withErrors = error as { errors?: ApiErrorLike[] };
  const first = Array.isArray(withErrors.errors) ? withErrors.errors[0] : undefined;
  const single = error as ApiErrorLike;
  const code = first?.code ?? single.code;

  if (isOffline(code)) return OFFLINE_MESSAGE;
  if (code && FRIENDLY_BY_CODE[code]) return FRIENDLY_BY_CODE[code];
  if (first?.longMessage) return first.longMessage;
  if (single.longMessage) return single.longMessage;
  if (error instanceof Error && /network|fetch|offline/i.test(error.message)) return OFFLINE_MESSAGE;
  return 'Something went wrong. Please try again.';
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}
