import { CloudError } from './cloud-error';
import { bytesToHex, utf8Decode, utf8Encode } from './encoding';

/**
 * The encrypted file ClayHabbit keeps in Google Drive.
 *
 * - Encryption is AES-256-GCM: every save gets a fresh random 96-bit nonce,
 *   and the 128-bit tag means any change to the ciphertext is detected.
 * - SHA-256 does the jobs a hash can do: it fingerprints the key (`keyId`,
 *   so a wrong key is reported as such instead of as corruption) and the
 *   plaintext (`sha256`, checked again after decrypting, and used to skip
 *   uploads when nothing changed). A hash is one-way, so on its own it can't
 *   encrypt anything; AES does that part.
 * - The format, scope and key fingerprint are bound in as additional
 *   authenticated data, so an envelope can't be passed off as another
 *   account's.
 *
 * Only ciphertext and these few labels ever leave the phone.
 */

export const ENVELOPE_FORMAT = 'clayhabit-cloud';
export const ENVELOPE_VERSION = 1;

/** The crypto primitives the envelope needs; the app uses expo-crypto, tests use WebCrypto. */
export interface CipherSuite {
  sha256Hex(bytes: Uint8Array): Promise<string>;
  /** AES-256-GCM. Returns base64 of nonce ‖ ciphertext ‖ tag. */
  seal(plaintext: Uint8Array, key: Uint8Array, aad: Uint8Array): Promise<string>;
  /** Inverse of `seal`; rejects when the tag doesn't verify. */
  open(sealed: string, key: Uint8Array, aad: Uint8Array): Promise<Uint8Array>;
  randomBytes(count: number): Uint8Array;
}

export interface CloudEnvelope {
  format: typeof ENVELOPE_FORMAT;
  version: typeof ENVELOPE_VERSION;
  cipher: 'AES-256-GCM';
  hash: 'SHA-256';
  /** Whose data this is: the account id, or `local`. */
  scope: string;
  /** Short SHA-256 fingerprint of the key it was sealed with. */
  keyId: string;
  /** Changes on every upload; how devices notice each other's saves. */
  snapshotId: string;
  createdAt: string;
  device: string | null;
  /** The database's `user_version` when it was saved. */
  schemaVersion: number;
  /** SHA-256 of the plaintext database. */
  sha256: string;
  size: number;
  /** Sealed database bytes. */
  data: string;
  /** Sealed JSON of the preferences that follow you between phones. */
  prefs: string | null;
}

export interface SnapshotContents {
  bytes: Uint8Array;
  prefs: Record<string, unknown> | null;
}

export const KEY_BYTES = 32;

/** First 16 hex digits of SHA-256 over a domain-separated copy of the key. */
export async function keyIdFor(suite: CipherSuite, key: Uint8Array): Promise<string> {
  const label = utf8Encode('clayhabit-cloud-key-id:');
  const input = new Uint8Array(label.length + key.length);
  input.set(label);
  input.set(key, label.length);
  return (await suite.sha256Hex(input)).slice(0, 16);
}

export function newSnapshotId(suite: CipherSuite): string {
  return bytesToHex(suite.randomBytes(12));
}

function associatedData(scope: string, keyId: string, part: 'data' | 'prefs'): Uint8Array {
  return utf8Encode(`${ENVELOPE_FORMAT}/${ENVELOPE_VERSION}|${scope}|${keyId}|${part}`);
}

export async function sealSnapshot(
  suite: CipherSuite,
  input: {
    bytes: Uint8Array;
    prefs: Record<string, unknown> | null;
    key: Uint8Array;
    keyId: string;
    scope: string;
    snapshotId: string;
    device: string | null;
    schemaVersion: number;
    sha256?: string;
    now: Date;
  },
): Promise<CloudEnvelope> {
  if (input.key.length !== KEY_BYTES) throw new CloudError('wrong-key', 'key must be 256-bit');
  const sha256 = input.sha256 ?? (await suite.sha256Hex(input.bytes));
  const data = await suite.seal(input.bytes, input.key, associatedData(input.scope, input.keyId, 'data'));
  const prefs = input.prefs
    ? await suite.seal(
        utf8Encode(JSON.stringify(input.prefs)),
        input.key,
        associatedData(input.scope, input.keyId, 'prefs'),
      )
    : null;

  return {
    format: ENVELOPE_FORMAT,
    version: ENVELOPE_VERSION,
    cipher: 'AES-256-GCM',
    hash: 'SHA-256',
    scope: input.scope,
    keyId: input.keyId,
    snapshotId: input.snapshotId,
    createdAt: input.now.toISOString(),
    device: input.device,
    schemaVersion: input.schemaVersion,
    sha256,
    size: input.bytes.length,
    data,
    prefs,
  };
}

/** Parses and shape-checks a downloaded envelope without decrypting it. */
export function parseEnvelope(text: string): CloudEnvelope {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new CloudError('corrupt', 'not JSON');
  }
  const envelope = value as Partial<CloudEnvelope> | null;
  if (!envelope || envelope.format !== ENVELOPE_FORMAT) throw new CloudError('corrupt', 'unknown format');
  if (typeof envelope.version !== 'number' || envelope.version > ENVELOPE_VERSION) {
    throw new CloudError('newer-app', `envelope v${envelope.version}`);
  }
  if (
    envelope.cipher !== 'AES-256-GCM' ||
    typeof envelope.scope !== 'string' ||
    typeof envelope.keyId !== 'string' ||
    typeof envelope.snapshotId !== 'string' ||
    typeof envelope.sha256 !== 'string' ||
    typeof envelope.data !== 'string' ||
    typeof envelope.schemaVersion !== 'number'
  ) {
    throw new CloudError('corrupt', 'missing fields');
  }
  return envelope as CloudEnvelope;
}

export async function openSnapshot(
  suite: CipherSuite,
  envelope: CloudEnvelope,
  expected: { key: Uint8Array; keyId: string; scope: string },
): Promise<SnapshotContents> {
  if (envelope.scope !== expected.scope) throw new CloudError('corrupt', 'belongs to another account');
  if (envelope.keyId !== expected.keyId) throw new CloudError('wrong-key');

  let bytes: Uint8Array;
  try {
    bytes = await suite.open(envelope.data, expected.key, associatedData(envelope.scope, envelope.keyId, 'data'));
  } catch (error) {
    // Right key (the fingerprint matched), so a failed tag means the bytes were altered.
    // The native error stays in the detail: a platform bug surfaces the same way.
    throw new CloudError('tampered', error instanceof Error ? error.message : undefined);
  }
  if ((await suite.sha256Hex(bytes)) !== envelope.sha256) throw new CloudError('tampered', 'SHA-256 mismatch');

  let prefs: Record<string, unknown> | null = null;
  if (envelope.prefs) {
    try {
      const plain = await suite.open(
        envelope.prefs,
        expected.key,
        associatedData(envelope.scope, envelope.keyId, 'prefs'),
      );
      const parsed: unknown = JSON.parse(utf8Decode(plain));
      prefs = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      // Preferences are a nicety; losing them must never block restoring the data itself.
      prefs = null;
    }
  }
  return { bytes, prefs };
}
