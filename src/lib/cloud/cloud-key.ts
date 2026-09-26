import * as SecureStore from 'expo-secure-store';

import { base64ToBytes } from './encoding';

/**
 * The Cloud key as older versions kept it: 256 random bits, escrowed in the
 * Clerk account and cached here in SecureStore. Passcode keyrings
 * (lib/vault) replace it. What remains is read-only, so an old Cloud copy can
 * still be opened once and re-sealed; after that it's forgotten for good.
 */

export interface KeyRecord {
  /** Base64 of the 32 key bytes. */
  key: string;
  keyId: string;
  createdAt: string;
  googleEmail?: string | null;
}

function storageKey(scope: string): string {
  // SecureStore keys allow only alphanumerics, ".", "-" and "_".
  return `clayhabit.cloud.key.${scope.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export function isKeyRecord(value: unknown): value is KeyRecord {
  const record = value as Partial<KeyRecord> | null;
  return (
    !!record &&
    typeof record.key === 'string' &&
    typeof record.keyId === 'string' &&
    typeof record.createdAt === 'string'
  );
}

export function keyBytesOf(record: KeyRecord): Uint8Array {
  return base64ToBytes(record.key);
}

export async function loadCachedKey(scope: string): Promise<KeyRecord | null> {
  const raw = await SecureStore.getItemAsync(storageKey(scope));
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isKeyRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function forgetCachedKey(scope: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(scope));
}
