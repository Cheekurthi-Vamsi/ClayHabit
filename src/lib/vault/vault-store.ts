import * as SecureStore from 'expo-secure-store';

import { base64ToBytes, bytesToBase64 } from '../cloud/encoding';
import { lockoutFor } from '../security/app-lock-service';
import { parseKeyring, type DataKey, type Keyring } from './keyring';

/**
 * What the vault keeps on this phone, all in SecureStore (Android Keystore /
 * iOS Keychain), never in plain files or AsyncStorage:
 *
 * - the unlocked data key, so the passcode is needed once per install and
 *   day-to-day unlock stays App Lock / biometrics;
 * - the keyring (the data key locked with the passcode), to check the
 *   passcode for sensitive actions and to hand to the Cloud;
 * - failed passcode attempts, so guessing on the phone is throttled.
 */

function key(kind: 'dek' | 'keyring' | 'attempts', scope: string): string {
  // SecureStore keys allow only alphanumerics, ".", "-" and "_".
  return `clayhabit.vault.${kind}.${scope.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export async function loadDataKey(scope: string): Promise<DataKey | null> {
  const raw = await SecureStore.getItemAsync(key('dek', scope));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { key?: unknown; keyId?: unknown };
    if (typeof parsed.key !== 'string' || typeof parsed.keyId !== 'string') return null;
    const bytes = base64ToBytes(parsed.key);
    return bytes.length === 32 ? { key: bytes, keyId: parsed.keyId } : null;
  } catch {
    return null;
  }
}

export async function saveDataKey(scope: string, dataKey: DataKey): Promise<void> {
  await SecureStore.setItemAsync(key('dek', scope), JSON.stringify({ key: bytesToBase64(dataKey.key), keyId: dataKey.keyId }));
}

export async function loadLocalKeyring(scope: string): Promise<Keyring | null> {
  return parseKeyring(await SecureStore.getItemAsync(key('keyring', scope)));
}

export async function saveLocalKeyring(scope: string, keyring: Keyring): Promise<void> {
  await SecureStore.setItemAsync(key('keyring', scope), JSON.stringify(keyring));
}

/** Forgets the unlocked key (sign-out). The keyring stays, so the passcode brings the data back. */
export async function forgetDataKey(scope: string): Promise<void> {
  await SecureStore.deleteItemAsync(key('dek', scope));
}

/** Forgets everything the vault kept for this account ("start over"). */
export async function resetVault(scope: string): Promise<void> {
  await SecureStore.deleteItemAsync(key('dek', scope));
  await SecureStore.deleteItemAsync(key('keyring', scope));
  await SecureStore.deleteItemAsync(key('attempts', scope));
}

interface Attempts {
  failures: number;
  lockedUntil: number;
}

async function loadAttempts(scope: string): Promise<Attempts> {
  try {
    const raw = await SecureStore.getItemAsync(key('attempts', scope));
    const parsed = raw ? (JSON.parse(raw) as Attempts) : null;
    return parsed && typeof parsed.failures === 'number' ? parsed : { failures: 0, lockedUntil: 0 };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** Milliseconds until another passcode attempt is allowed (0 = now). */
export async function passcodeWait(scope: string, now = Date.now()): Promise<number> {
  const attempts = await loadAttempts(scope);
  return Math.max(0, attempts.lockedUntil - now);
}

export async function recordPasscodeFailure(scope: string, now = Date.now()): Promise<number> {
  const failures = (await loadAttempts(scope)).failures + 1;
  const waitMs = lockoutFor(failures);
  await SecureStore.setItemAsync(key('attempts', scope), JSON.stringify({ failures, lockedUntil: now + waitMs }));
  return waitMs;
}

export async function clearPasscodeFailures(scope: string): Promise<void> {
  await SecureStore.deleteItemAsync(key('attempts', scope));
}

/** SQLCipher raw-key form: x'<64 hex digits>' — used as-is, skipping SQLCipher's own KDF. */
export function sqlcipherKey(dataKey: DataKey): string {
  let hex = '';
  for (const byte of dataKey.key) hex += byte.toString(16).padStart(2, '0');
  return `"x'${hex}'"`;
}
