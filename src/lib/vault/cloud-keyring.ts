import type { CloudFileStore } from '../cloud/drive-client';
import { parseKeyring, type Keyring } from './keyring';

/**
 * The keyring's copy in Google Drive's private app folder, next to the
 * encrypted snapshot, so a new phone can unlock the Cloud with the passcode
 * alone. It only holds the passcode-locked key; see keyring.ts.
 */
export function keyringFileName(scope: string): string {
  return `clayhabit-${scope.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)}.keyring.json`;
}

export interface RemoteKeyring {
  fileId: string;
  keyring: Keyring;
}

export async function fetchRemoteKeyring(store: CloudFileStore, scope: string): Promise<RemoteKeyring | null> {
  const file = await store.find(keyringFileName(scope));
  if (!file) return null;
  const keyring = parseKeyring(await store.download(file.id));
  return keyring ? { fileId: file.id, keyring } : null;
}

export async function saveRemoteKeyring(
  store: CloudFileStore,
  scope: string,
  keyring: Keyring,
  existingId: string | null = null,
): Promise<void> {
  await store.save({
    id: existingId,
    name: keyringFileName(scope),
    content: JSON.stringify(keyring),
    appProperties: { keyId: keyring.keyId },
  });
}
