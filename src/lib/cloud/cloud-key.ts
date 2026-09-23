import * as SecureStore from 'expo-secure-store';

import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes } from './encoding';
import { KEY_BYTES, keyIdFor, type CipherSuite } from './envelope';

/**
 * The account key: 256 random bits that encrypt this account's Cloud data.
 *
 * It is held in two places, never next to the data it protects:
 *   1. with the ClayHabbit account (the key escrow), so signing in on a new
 *      phone brings it back with no extra step, and
 *   2. in this phone's Keychain / Keystore, so the app still opens offline.
 * Google Drive only ever holds ciphertext, so Google alone can't read it.
 */

export interface KeyRecord {
  /** Base64 of the 32 key bytes. */
  key: string;
  keyId: string;
  createdAt: string;
  /** The Google account whose Drive holds the data, to catch connecting the wrong one. */
  googleEmail?: string | null;
}

/** Where the key is kept with the account. Null when sign-in isn't configured. */
export interface KeyEscrow {
  read(): Promise<KeyRecord | null>;
  write(record: KeyRecord): Promise<void>;
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

export async function createKeyRecord(suite: CipherSuite, googleEmail: string | null, now = new Date()): Promise<KeyRecord> {
  const key = suite.randomBytes(KEY_BYTES);
  return { key: bytesToBase64(key), keyId: await keyIdFor(suite, key), createdAt: now.toISOString(), googleEmail };
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

export async function cacheKey(scope: string, record: KeyRecord): Promise<void> {
  await SecureStore.setItemAsync(storageKey(scope), JSON.stringify(record));
}

export async function forgetCachedKey(scope: string): Promise<void> {
  await SecureStore.deleteItemAsync(storageKey(scope));
}

/** The key as 8 groups of 8 hex digits — the backup form people can write down. */
export function formatBackupKey(record: KeyRecord): string {
  const hex = bytesToHex(keyBytesOf(record)).toUpperCase();
  return hex.match(/.{1,8}/g)!.join('-');
}

/** Accepts a backup key typed with any spacing, dashes or case. Null if it isn't one. */
export async function recordFromBackupKey(
  suite: CipherSuite,
  input: string,
  googleEmail: string | null,
): Promise<KeyRecord | null> {
  const hex = input.replace(/[^0-9a-fA-F]/g, '');
  if (hex.length !== KEY_BYTES * 2) return null;
  const bytes = hexToBytes(hex);
  if (!bytes) return null;
  return {
    key: bytesToBase64(bytes),
    keyId: await keyIdFor(suite, bytes),
    createdAt: new Date().toISOString(),
    googleEmail,
  };
}
