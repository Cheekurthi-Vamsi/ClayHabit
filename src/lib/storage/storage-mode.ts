import * as SecureStore from 'expo-secure-store';

/**
 * Where an account's data lives, chosen once right after signing in:
 *
 * - `device`: only in this phone's SQLite database. Nothing is uploaded.
 * - `cloud`:  the same SQLite database, plus an encrypted snapshot kept in
 *             the person's Google Drive app folder and synced in the
 *             background (see lib/cloud/sync-engine.ts).
 *
 * Either way the app reads and writes the local database, so it is equally
 * fast and works offline; Cloud only adds backup and restore across phones.
 * The choice is cached on the phone (so start-up never waits on the
 * network) and kept with the account, so a new phone can restore a Cloud
 * user straight away instead of asking again.
 */
export type StorageMode = 'device' | 'cloud';

/** Reads and writes the choice kept with the account. Null when sign-in is off. */
export interface StorageModeRemote {
  read(): Promise<StorageMode | null>;
  write(mode: StorageMode): Promise<void>;
}

export function isStorageMode(value: unknown): value is StorageMode {
  return value === 'device' || value === 'cloud';
}

function storageKey(scope: string): string {
  // SecureStore keys allow only alphanumerics, ".", "-" and "_".
  return `clayhabit.storage.mode.${scope.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export async function loadLocalStorageMode(scope: string): Promise<StorageMode | null> {
  const value = await SecureStore.getItemAsync(storageKey(scope));
  return isStorageMode(value) ? value : null;
}

export async function saveLocalStorageMode(scope: string, mode: StorageMode): Promise<void> {
  await SecureStore.setItemAsync(storageKey(scope), mode);
}

/**
 * This phone's answer first; otherwise the account's. Only a remembered
 * `cloud` is adopted from the account — "this phone only" was about another
 * phone, so a new one asks again.
 */
export async function resolveStorageMode(
  scope: string,
  remote: StorageModeRemote | null,
): Promise<StorageMode | null> {
  const local = await loadLocalStorageMode(scope).catch(() => null);
  if (local) return local;
  const fromAccount = await remote?.read().catch(() => null);
  if (fromAccount === 'cloud') {
    await saveLocalStorageMode(scope, 'cloud').catch(() => {});
    return 'cloud';
  }
  return null;
}
