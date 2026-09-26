import { CloudError } from '../cloud/cloud-error';
import { base64ToBytes, bytesToBase64, utf8Encode } from '../cloud/encoding';
import { KEY_BYTES, keyIdFor, type CipherSuite } from '../cloud/envelope';
import { pbkdf2Sha256 } from './kdf';

/**
 * The account's data key, locked with the person's passcode.
 *
 *   data key (DEK) = 256 random bits. Encrypts the phone's database
 *                    (SQLCipher) and the Cloud copy (AES-256-GCM envelope).
 *   KEK            = PBKDF2-HMAC-SHA256(passcode, random salt, 600k rounds)
 *   keyring        = AES-256-GCM(KEK, DEK) + salt + rounds
 *
 * The keyring is safe to store next to the data (Drive, the phone): without
 * the passcode it's useless, and the slow KDF makes guessing an 8+ character
 * passcode impractical. Nothing about the passcode or the key goes to Clerk.
 * A wrong passcode fails the GCM tag, so no separate hash is ever stored.
 */

export const KEYRING_FORMAT = 'clayhabit-keyring';
export const KEYRING_VERSION = 1;
/** OWASP's 2023 recommendation for PBKDF2-HMAC-SHA256. */
export const DEFAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const MIN_ITERATIONS = 100_000;

export interface Keyring {
  format: typeof KEYRING_FORMAT;
  version: typeof KEYRING_VERSION;
  kdf: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  /** Base64. */
  salt: string;
  /** Base64 of nonce ‖ AES-256-GCM(DEK) ‖ tag. */
  wrappedKey: string;
  /** Fingerprint of the DEK (not of the passcode), so envelopes can say which key sealed them. */
  keyId: string;
  createdAt: string;
}

export interface DataKey {
  key: Uint8Array;
  keyId: string;
}

export const PASSCODE_MIN_LENGTH = 8;

/** Why a passcode can't be used, or null when it's fine. */
export function passcodeProblem(passcode: string): string | null {
  if (passcode.length < PASSCODE_MIN_LENGTH) return `Use at least ${PASSCODE_MIN_LENGTH} characters.`;
  if (passcode.length > 128) return 'Use at most 128 characters.';
  if (!/[A-Za-z]/.test(passcode) || !/\d/.test(passcode)) return 'Use both letters and numbers.';
  if (/^(.)\1+$/.test(passcode)) return 'Don’t repeat one character.';
  return null;
}

function wrapAad(keyId: string): Uint8Array {
  return utf8Encode(`${KEYRING_FORMAT}/${KEYRING_VERSION}|${keyId}`);
}

async function wrap(
  suite: CipherSuite,
  dataKey: DataKey,
  passcode: string,
  iterations: number,
  now: Date,
): Promise<Keyring> {
  const salt = suite.randomBytes(SALT_BYTES);
  const kek = await pbkdf2Sha256(passcode, salt, iterations);
  return {
    format: KEYRING_FORMAT,
    version: KEYRING_VERSION,
    kdf: 'PBKDF2-HMAC-SHA256',
    iterations,
    salt: bytesToBase64(salt),
    wrappedKey: await suite.seal(dataKey.key, kek, wrapAad(dataKey.keyId)),
    keyId: dataKey.keyId,
    createdAt: now.toISOString(),
  };
}

/** A brand-new data key, locked with `passcode`. */
export async function createKeyring(
  suite: CipherSuite,
  passcode: string,
  { iterations = DEFAULT_ITERATIONS, now = new Date() }: { iterations?: number; now?: Date } = {},
): Promise<{ keyring: Keyring; dataKey: DataKey }> {
  const problem = passcodeProblem(passcode);
  if (problem) throw new Error(problem);
  const key = suite.randomBytes(KEY_BYTES);
  const dataKey = { key, keyId: await keyIdFor(suite, key) };
  return { keyring: await wrap(suite, dataKey, passcode, iterations, now), dataKey };
}

/** The same data key under a new passcode (and fresh salt). */
export async function rewrapKeyring(
  suite: CipherSuite,
  dataKey: DataKey,
  newPasscode: string,
  { iterations = DEFAULT_ITERATIONS, now = new Date() }: { iterations?: number; now?: Date } = {},
): Promise<Keyring> {
  const problem = passcodeProblem(newPasscode);
  if (problem) throw new Error(problem);
  return wrap(suite, dataKey, newPasscode, iterations, now);
}

export class WrongPasscodeError extends Error {
  constructor() {
    super('That passcode doesn’t unlock this data.');
    this.name = 'WrongPasscodeError';
  }
}

/** Unlocks the data key. Throws WrongPasscodeError when the passcode is wrong. */
export async function openKeyring(suite: CipherSuite, keyring: Keyring, passcode: string): Promise<DataKey> {
  const kek = await pbkdf2Sha256(passcode, base64ToBytes(keyring.salt), keyring.iterations);
  let key: Uint8Array;
  try {
    key = await suite.open(keyring.wrappedKey, kek, wrapAad(keyring.keyId));
  } catch {
    throw new WrongPasscodeError();
  }
  if (key.length !== KEY_BYTES || (await keyIdFor(suite, key)) !== keyring.keyId) {
    throw new CloudError('tampered', 'keyring key does not match its fingerprint');
  }
  return { key, keyId: keyring.keyId };
}

/** Parses and shape-checks a stored keyring; null when it isn't one. */
export function parseKeyring(text: string | null): Keyring | null {
  if (!text) return null;
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  const keyring = value as Partial<Keyring> | null;
  if (
    !keyring ||
    keyring.format !== KEYRING_FORMAT ||
    keyring.version !== KEYRING_VERSION ||
    keyring.kdf !== 'PBKDF2-HMAC-SHA256' ||
    typeof keyring.iterations !== 'number' ||
    keyring.iterations < MIN_ITERATIONS ||
    keyring.iterations > 10_000_000 ||
    typeof keyring.salt !== 'string' ||
    typeof keyring.wrappedKey !== 'string' ||
    typeof keyring.keyId !== 'string'
  ) {
    return null;
  }
  return keyring as Keyring;
}
