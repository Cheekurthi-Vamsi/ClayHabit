import { CloudError } from '@/lib/cloud/cloud-error';

import { GOOGLE_WEB_CLIENT_ID } from './config';

/**
 * Google Drive access in the browser with Google Identity Services' token
 * client: a small Google popup, the narrow `drive.appdata` scope only, and an
 * access token kept in memory (never stored). It's the same Google OAuth
 * client as the phone, so the same Drive app folder.
 */

interface TokenResponse {
  access_token?: string;
  expires_in?: number | string;
  scope?: string;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken(options?: { prompt?: '' | 'none' | 'consent' | 'select_account'; login_hint?: string }): void;
}

interface GoogleAccounts {
  oauth2: {
    initTokenClient(config: {
      client_id: string;
      scope: string;
      include_granted_scopes?: boolean;
      login_hint?: string;
      callback: (response: TokenResponse) => void;
      error_callback?: (error: { type: string; message?: string }) => void;
    }): TokenClient;
    revoke(token: string, done?: () => void): void;
  };
}

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

const GIS_SRC = 'https://accounts.google.com/gsi/client';
/** Only the app's own hidden folder in Drive (same scope as src/lib/cloud/config.ts). */
const DRIVE_APPDATA_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
/** Refresh a little before Google's hour is up, so a save never races the expiry. */
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

let gisLoading: Promise<GoogleAccounts> | null = null;

function loadGis(): Promise<GoogleAccounts> {
  if (window.google?.accounts) return Promise.resolve(window.google.accounts);
  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SRC;
    script.async = true;
    script.onload = () => (window.google?.accounts ? resolve(window.google.accounts) : reject(new CloudError('misconfigured')));
    script.onerror = () => {
      gisLoading = null;
      reject(new CloudError('offline'));
    };
    document.head.appendChild(script);
  });
  return gisLoading;
}

/** Starts loading Google's script early (e.g. on the Connect screen), so the click opens the popup at once. */
export function preloadGoogle(): void {
  void loadGis().catch(() => {});
}

interface Session {
  token: string;
  expiresAt: number;
}

let session: Session | null = null;
let loginHint: string | undefined;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

/** Tells the UI when the Drive connection starts or ends. */
export function onDriveSessionChange(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setDriveLoginHint(email: string | null | undefined) {
  loginHint = email ?? undefined;
}

export function driveConnected(): boolean {
  return !!session && session.expiresAt - EXPIRY_MARGIN_MS > Date.now();
}

/**
 * Opens Google's consent popup. Call it straight from a click, so the browser
 * lets the popup open. `quiet` skips the consent screen when access was
 * already granted (the popup closes on its own).
 */
export async function connectDrive(options: { quiet?: boolean } = {}): Promise<void> {
  if (!GOOGLE_WEB_CLIENT_ID) throw new CloudError('misconfigured', 'EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  const accounts = await loadGis();
  await new Promise<void>((resolve, reject) => {
    const client = accounts.oauth2.initTokenClient({
      client_id: GOOGLE_WEB_CLIENT_ID,
      scope: DRIVE_APPDATA_SCOPE,
      include_granted_scopes: true,
      login_hint: loginHint,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(response.error === 'access_denied' ? new CloudError('cancelled') : new CloudError('auth', response.error));
          return;
        }
        if (!String(response.scope ?? '').split(' ').includes(DRIVE_APPDATA_SCOPE)) {
          reject(new CloudError('permission'));
          return;
        }
        session = { token: response.access_token, expiresAt: Date.now() + Number(response.expires_in ?? 3600) * 1000 };
        notify();
        resolve();
      },
      error_callback: (error) => {
        // popup_closed, popup_failed_to_open, unknown
        reject(error.type === 'popup_failed_to_open' ? new CloudError('unknown', 'Allow pop-ups for this site') : new CloudError('cancelled'));
      },
    });
    client.requestAccessToken({ prompt: options.quiet ? '' : 'consent', login_hint: loginHint });
  });
}

/** The token for Drive requests (`TokenProvider` in src/lib/cloud/drive-client.ts). */
export async function getDriveToken(options: { refresh?: boolean } = {}): Promise<string> {
  if (options.refresh) session = null;
  if (!driveConnected() || !session) {
    session = null;
    notify();
    throw new CloudError('auth');
  }
  return session.token;
}

export function disconnectDrive(): void {
  const token = session?.token;
  session = null;
  notify();
  if (token && window.google?.accounts) window.google.accounts.oauth2.revoke(token);
}

/** Forgets the token without revoking the permission (sign-out, lock). */
export function forgetDriveToken(): void {
  session = null;
  notify();
}
