/**
 * Every way talking to the Cloud can fail, each with one plain-language
 * message. Screens show `message`; code decides what to offer next.
 */
export type CloudErrorCode =
  | 'offline'
  | 'cancelled'
  | 'auth'
  | 'permission'
  | 'quota'
  | 'wrong-key'
  | 'tampered'
  | 'corrupt'
  | 'newer-app'
  | 'misconfigured'
  | 'developer-error'
  | 'api-disabled'
  | 'unknown';

const MESSAGES: Record<CloudErrorCode, string> = {
  offline: "You're offline. Your Cloud will catch up once you're back online.",
  cancelled: 'Google sign-in was cancelled.',
  auth: 'Your Google session expired. Connect your Cloud again.',
  permission: 'ClayHabbit needs permission to keep its data in your Google Drive. Allow it when Google asks.',
  quota: 'Your Google Drive is full. Free up some space so ClayHabbit can save.',
  'wrong-key': "This Cloud copy was locked with a different key, so it can't be opened here.",
  tampered: 'The Cloud copy failed its integrity check, so it was not used. Nothing on this phone was changed.',
  corrupt: "The Cloud copy couldn't be read. Nothing on this phone was changed.",
  'newer-app': 'Your Cloud data was saved by a newer version of ClayHabbit. Update the app to open it.',
  misconfigured:
    "Google sign-in isn't set up for this build yet. Check the OAuth client IDs and the app's signing certificate (SHA-1) in Google Cloud.",
  // Google Play services code 10: the APK's package + signing SHA-1 has no Android OAuth client.
  'developer-error':
    "Google rejected this app build (DEVELOPER_ERROR). Its package name and signing SHA-1 must be registered as an Android OAuth client in Google Cloud, and the web client ID must come from the same project.",
  'api-disabled':
    "Google Drive API is turned off for ClayHabbit's Google Cloud project. Turn it on under APIs & Services → Library → Google Drive API, then try again.",
  unknown: 'Something went wrong while syncing. Your data on this phone is safe.',
};

export class CloudError extends Error {
  readonly code: CloudErrorCode;

  constructor(code: CloudErrorCode, detail?: string) {
    super(detail ? `${MESSAGES[code]} (${detail})` : MESSAGES[code]);
    this.name = 'CloudError';
    this.code = code;
  }
}

export function toCloudError(error: unknown): CloudError {
  if (error instanceof CloudError) return error;
  // fetch rejects with a TypeError ("Network request failed") when there's no connection.
  if (error instanceof TypeError) return new CloudError('offline');
  return new CloudError('unknown', error instanceof Error ? error.message : undefined);
}

// Failures nobody can act on without knowing what went wrong underneath.
const SHOW_DETAIL: ReadonlySet<CloudErrorCode> = new Set(['tampered', 'corrupt', 'unknown']);

/** The message to show; the technical detail only where it's the one clue to the cause. */
export function cloudErrorMessage(error: unknown): string {
  const cloudError = toCloudError(error);
  return SHOW_DETAIL.has(cloudError.code) ? cloudError.message : MESSAGES[cloudError.code];
}
