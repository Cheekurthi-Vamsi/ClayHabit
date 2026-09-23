import { CloudError } from '../cloud-error';
import { base64ToBytes, bytesToBase64, bytesToHex, hexToBytes, utf8Decode, utf8Encode } from '../encoding';
import { keyIdFor, openSnapshot, parseEnvelope, sealSnapshot } from '../envelope';
import { nodeCipherSuite as suite } from '../testing/node-cipher-suite';

const scope = 'user_123';

async function newKey() {
  const key = suite.randomBytes(32);
  return { key, keyId: await keyIdFor(suite, key) };
}

async function seal(bytes: Uint8Array, prefs: Record<string, unknown> | null = null) {
  const { key, keyId } = await newKey();
  const envelope = await sealSnapshot(suite, {
    bytes,
    prefs,
    key,
    keyId,
    scope,
    snapshotId: 'snap-1',
    device: 'Test phone',
    schemaVersion: 11,
    now: new Date('2026-09-21T10:00:00Z'),
  });
  return { envelope, key, keyId };
}

async function expectCloudError(promise: Promise<unknown>, code: string) {
  await expect(promise).rejects.toBeInstanceOf(CloudError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe('encoding', () => {
  it('round-trips bytes through base64, including large buffers', () => {
    const bytes = suite.randomBytes(100_000);
    expect(base64ToBytes(bytesToBase64(bytes))).toEqual(bytes);
    expect(bytesToBase64(new Uint8Array([104, 105]))).toBe('aGk=');
  });

  it('round-trips text through UTF-8 like the platform encoder', () => {
    const text = 'Rent ₹12,000 · नमस्ते · 🎯 done';
    expect(utf8Encode(text)).toEqual(new Uint8Array(Buffer.from(text, 'utf8')));
    expect(utf8Decode(utf8Encode(text))).toBe(text);
  });

  it('converts hex both ways and rejects junk', () => {
    expect(bytesToHex(new Uint8Array([0, 15, 255]))).toBe('000fff');
    expect(hexToBytes('000fff')).toEqual(new Uint8Array([0, 15, 255]));
    expect(hexToBytes('abc')).toBeNull();
    expect(hexToBytes('zz')).toBeNull();
  });
});

describe('Cloud envelope (AES-256-GCM + SHA-256)', () => {
  const database = utf8Encode('SQLite format 3\u0000 pretend database with ₹ and notes');

  it('never contains the plaintext, and opens back to the exact bytes', async () => {
    const { envelope, key, keyId } = await seal(database, { themePreference: 'dark', displayName: 'Asha' });
    const text = JSON.stringify(envelope);

    expect(text).not.toContain('pretend database');
    expect(text).not.toContain('Asha');
    expect(envelope.cipher).toBe('AES-256-GCM');
    expect(envelope.sha256).toBe(await suite.sha256Hex(database));
    expect(envelope.keyId).toHaveLength(16);

    const opened = await openSnapshot(suite, parseEnvelope(text), { key, keyId, scope });
    expect(opened.bytes).toEqual(database);
    expect(opened.prefs).toEqual({ themePreference: 'dark', displayName: 'Asha' });
  });

  it('uses a fresh nonce every time, so the same data never encrypts the same way twice', async () => {
    const { key, keyId } = await newKey();
    const input = { bytes: database, prefs: null, key, keyId, scope, snapshotId: 's', device: null, schemaVersion: 1, now: new Date() };
    const a = await sealSnapshot(suite, input);
    const b = await sealSnapshot(suite, input);
    expect(a.data).not.toBe(b.data);
  });

  it('reports a different key as the wrong key, not as corruption', async () => {
    const { envelope } = await seal(database);
    const other = await newKey();
    await expectCloudError(openSnapshot(suite, envelope, { ...other, scope }), 'wrong-key');
  });

  it('detects a single flipped bit in the ciphertext', async () => {
    const { envelope, key, keyId } = await seal(database);
    const bytes = base64ToBytes(envelope.data);
    bytes[20] ^= 1;
    const tampered = { ...envelope, data: bytesToBase64(bytes) };
    await expectCloudError(openSnapshot(suite, tampered, { key, keyId, scope }), 'tampered');
  });

  it('detects a swapped SHA-256 fingerprint', async () => {
    const { envelope, key, keyId } = await seal(database);
    const tampered = { ...envelope, sha256: '0'.repeat(64) };
    await expectCloudError(openSnapshot(suite, tampered, { key, keyId, scope }), 'tampered');
  });

  it("refuses another account's envelope even with the same key", async () => {
    const { envelope, key, keyId } = await seal(database);
    await expectCloudError(openSnapshot(suite, envelope, { key, keyId, scope: 'someone_else' }), 'corrupt');
    // Relabelling the scope doesn't help: it's bound into the authenticated data.
    await expectCloudError(openSnapshot(suite, { ...envelope, scope: 'x' }, { key, keyId, scope: 'x' }), 'tampered');
  });

  it('still restores the data when only the preferences are unreadable', async () => {
    const { envelope, key, keyId } = await seal(database, { a: 1 });
    const opened = await openSnapshot(suite, { ...envelope, prefs: 'AAAA' }, { key, keyId, scope });
    expect(opened.bytes).toEqual(database);
    expect(opened.prefs).toBeNull();
  });

  it('rejects files that are not envelopes, and ones from a newer app', () => {
    expect(() => parseEnvelope('not json')).toThrow(CloudError);
    expect(() => parseEnvelope(JSON.stringify({ format: 'other' }))).toThrow(CloudError);
    let thrown: unknown;
    try {
      parseEnvelope(JSON.stringify({ format: 'clayhabit-cloud', version: 99 }));
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({ code: 'newer-app' });
  });
});
