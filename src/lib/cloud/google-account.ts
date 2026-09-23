import { TurboModuleRegistry } from 'react-native';

import { CloudError } from './cloud-error';
import { DRIVE_APPDATA_SCOPE, GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from './config';

/**
 * Google sign-in, via `@react-native-google-signin/google-signin` (the library
 * Expo's docs recommend). One native Google session serves two purposes:
 *
 *   1. Signing in to ClayHabbit — its ID token (audience: the web client ID)
 *      is exchanged with Clerk, so there are no passwords.
 *   2. The Cloud — the same account is later asked for the narrow
 *      `drive.appdata` scope, but only if the person chooses Cloud storage.
 *
 * It is native code, so it needs a development/release build; Expo Go
 * doesn't include it. The package calls `TurboModuleRegistry.getEnforcing`
 * the moment it is imported, which throws when the native side is missing,
 * so it is loaded lazily after checking the module exists — the same guard
 * `expo-notifications` needed (see lib/notifications/expo-go-guard.ts).
 */

type GoogleSigninModule = typeof import('@react-native-google-signin/google-signin');

let loaded: GoogleSigninModule | null | undefined;
let configured = false;

function load(): GoogleSigninModule | null {
  if (loaded === undefined) {
    loaded = TurboModuleRegistry.get('RNGoogleSignin')
      ? // eslint-disable-next-line @typescript-eslint/no-require-imports
        (require('@react-native-google-signin/google-signin') as GoogleSigninModule)
      : null;
  }
  return loaded;
}

/** False in Expo Go (no native module). */
export function googleSignInAvailable(): boolean {
  return load() !== null;
}

function googleSignIn(): GoogleSigninModule {
  const google = load();
  if (!google) throw new CloudError('misconfigured', 'Google sign-in needs the development build');
  if (!configured) {
    google.GoogleSignin.configure({
      // Identity only. Drive is asked for separately, and only when the person picks Cloud storage.
      webClientId: GOOGLE_WEB_CLIENT_ID || undefined,
      iosClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      offlineAccess: false,
    });
    configured = true;
  }
  return google;
}

export interface GoogleAccount {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
}

type NativeUser = {
  user: GoogleAccount & Record<string, unknown>;
  scopes: string[];
  idToken: string | null;
};

function toAccount(data: NativeUser): GoogleAccount {
  return { id: data.user.id, email: data.user.email, name: data.user.name, photo: data.user.photo };
}

/** Translates the library's error codes into the app's Cloud errors. */
export function translateGoogleError(error: unknown): CloudError {
  if (error instanceof CloudError) return error;
  const google = load();
  const code = google && google.isErrorWithCode(error) ? String(error.code) : '';
  const message = String((error as Error)?.message ?? '');
  const statusCodes = google?.statusCodes;
  if (statusCodes && code === statusCodes.SIGN_IN_CANCELLED) return new CloudError('cancelled');
  if (statusCodes && code === statusCodes.SIGN_IN_REQUIRED) return new CloudError('auth');
  if (statusCodes && code === statusCodes.IN_PROGRESS) return new CloudError('cancelled');
  if (statusCodes && code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
    return new CloudError('misconfigured', 'Google Play services unavailable');
  }
  // Android: 7 = NETWORK_ERROR, 10 = DEVELOPER_ERROR (package / SHA-1 / client ID mismatch),
  // 12500 = SIGN_IN_FAILED (usually the OAuth consent screen: app in Testing without this account as a test user).
  if (code === '7' || /network/i.test(message)) return new CloudError('offline');
  if (code === '10' || /DEVELOPER_ERROR/.test(message)) return new CloudError('developer-error');
  if (code === '12500') {
    return new CloudError(
      'misconfigured',
      'SIGN_IN_FAILED — check the OAuth consent screen: publish it, or add this Google account as a test user',
    );
  }
  return new CloudError('unknown', [code, message].filter(Boolean).join(': ') || undefined);
}

async function ensureDriveScope(
  google: GoogleSigninModule,
  data: NativeUser,
): Promise<GoogleAccount> {
  if (data.scopes.includes(DRIVE_APPDATA_SCOPE)) return toAccount(data);
  // Shows only the Drive consent for the account that is already signed in.
  const granted = await google.GoogleSignin.addScopes({ scopes: [DRIVE_APPDATA_SCOPE] });
  if (!granted) throw new CloudError('auth');
  if (granted.type !== 'success') throw new CloudError('cancelled');
  if (!granted.data.scopes.includes(DRIVE_APPDATA_SCOPE)) throw new CloudError('permission');
  return toAccount(granted.data as NativeUser);
}

export interface GoogleIdentity {
  account: GoogleAccount;
  /** OpenID Connect ID token, audience = the web client ID. Exchanged with Clerk. */
  idToken: string;
}

/**
 * Signing in to ClayHabbit: Google's account picker, then an ID token for Clerk.
 * Always shows the picker (after forgetting any earlier choice), so switching
 * accounts on a shared phone is one tap.
 */
export async function signInWithGoogle(): Promise<GoogleIdentity> {
  const google = googleSignIn();
  if (!GOOGLE_WEB_CLIENT_ID) {
    throw new CloudError('misconfigured', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  }
  try {
    await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    if (google.GoogleSignin.hasPreviousSignIn())
      await google.GoogleSignin.signOut().catch(() => null);
    const response = await google.GoogleSignin.signIn();
    if (response.type !== 'success') throw new CloudError('cancelled');
    const data = response.data as NativeUser;
    if (!data.idToken)
      throw new CloudError(
        'misconfigured',
        'Google returned no ID token — check the web client ID',
      );
    return { account: toAccount(data), idToken: data.idToken };
  } catch (error) {
    throw translateGoogleError(error);
  }
}

/** Reconnects the Cloud without any UI when this phone already granted Drive access. Null if it hasn't. */
export async function connectSilently(): Promise<GoogleAccount | null> {
  const google = googleSignIn();
  try {
    const response = await google.GoogleSignin.signInSilently();
    if (response.type !== 'success') return null;
    const data = response.data as NativeUser;
    return data.scopes.includes(DRIVE_APPDATA_SCOPE) ? toAccount(data) : null;
  } catch (error) {
    const translated = translateGoogleError(error);
    if (translated.code === 'auth') return null;
    throw translated;
  }
}

/**
 * Connects the Cloud: reuses the Google account from sign-in when there is
 * one (so only Drive's consent sheet appears), otherwise the account picker.
 */
export async function connectInteractively(): Promise<GoogleAccount> {
  const google = googleSignIn();
  try {
    await google.GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    let data = google.GoogleSignin.getCurrentUser() as NativeUser | null;
    if (!data && google.GoogleSignin.hasPreviousSignIn()) {
      const silent = await google.GoogleSignin.signInSilently().catch(() => null);
      if (silent?.type === 'success') data = silent.data as NativeUser;
    }
    if (!data) {
      const response = await google.GoogleSignin.signIn();
      if (response.type !== 'success') throw new CloudError('cancelled');
      data = response.data as NativeUser;
    }
    return await ensureDriveScope(google, data);
  } catch (error) {
    throw translateGoogleError(error);
  }
}

let lastToken: string | null = null;

/** A Drive access token. Google refreshes it as needed; `refresh` drops a token Drive rejected. */
export async function getAccessToken(options: { refresh?: boolean } = {}): Promise<string> {
  const google = googleSignIn();
  try {
    if (options.refresh && lastToken) {
      await google.GoogleSignin.clearCachedAccessToken(lastToken).catch(() => null);
    }
    const tokens = await google.GoogleSignin.getTokens();
    lastToken = tokens.accessToken;
    return tokens.accessToken;
  } catch (error) {
    throw translateGoogleError(error);
  }
}

/** Forgets the Google account on this phone, so the next sign-in asks again. */
export async function disconnectGoogle(): Promise<void> {
  const google = load();
  if (!google) return;
  lastToken = null;
  try {
    googleSignIn();
    await google.GoogleSignin.signOut();
  } catch {
    // Signing out locally can't meaningfully fail; nothing to recover.
  }
}

/** Takes back the Drive permission as well, when the person stops using the Cloud. */
export async function revokeDriveAccess(): Promise<void> {
  const google = load();
  if (!google) return;
  lastToken = null;
  try {
    googleSignIn();
    await google.GoogleSignin.revokeAccess();
  } catch {
    // Already revoked or offline; Google also lets people remove it from their account settings.
  }
}
