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
 * The choice is kept on this phone only (Clerk is sign-in only), so each
 * new phone asks once; choosing Cloud there finds the existing copy.
 */
export type StorageMode = 'device' | 'cloud';

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
