import { nodeCipherSuite as suite } from '../../cloud/testing/node-cipher-suite';
import { createKeyring, openKeyring, parseKeyring, passcodeProblem, rewrapKeyring, WrongPasscodeError } from '../keyring';
import { sqlcipherKey } from '../vault-store';

jest.mock('expo-secure-store', () => ({}));
// The native module isn't built into Jest; the audited JS PBKDF2 stands in.
jest.mock('../../../../modules/clayhabit-kdf', () => ({ nativeKdf: null }));

// Far fewer rounds than the app's 600k keeps the suite fast; the maths is identical.
const FAST = { iterations: 1_000 };

describe('passcode keyring', () => {
  it('only accepts passcodes of 8+ characters with letters and numbers', () => {
    expect(passcodeProblem('short1')).toMatch(/at least 8/);
    expect(passcodeProblem('onlyletters')).toMatch(/letters and numbers/);
    expect(passcodeProblem('12345678')).toMatch(/letters and numbers/);
    expect(passcodeProblem('clay habit 2026')).toBeNull();
  });

  it('unlocks the same data key with the right passcode', async () => {
    const { keyring, dataKey } = await createKeyring(suite, 'correct horse 42', FAST);
    const opened = await openKeyring(suite, keyring, 'correct horse 42');
    expect(Buffer.from(opened.key).equals(Buffer.from(dataKey.key))).toBe(true);
    expect(opened.keyId).toBe(dataKey.keyId);
  });

  it('refuses a wrong passcode', async () => {
    const { keyring } = await createKeyring(suite, 'correct horse 42', FAST);
    await expect(openKeyring(suite, keyring, 'correct horse 43')).rejects.toBeInstanceOf(WrongPasscodeError);
  });

  it('never stores the key, the passcode or a plain hash of it', async () => {
    const { keyring, dataKey } = await createKeyring(suite, 'correct horse 42', FAST);
    const text = JSON.stringify(keyring);
    expect(text).not.toContain('correct horse 42');
    expect(text).not.toContain(Buffer.from(dataKey.key).toString('base64'));
    expect(text).not.toContain(Buffer.from(dataKey.key).toString('hex'));
  });

  it('changes the passcode without changing the data key', async () => {
    const { keyring, dataKey } = await createKeyring(suite, 'first pass 1', FAST);
    const next = await rewrapKeyring(suite, dataKey, 'second pass 2', FAST);
    expect(next.salt).not.toBe(keyring.salt);
    await expect(openKeyring(suite, next, 'first pass 1')).rejects.toBeInstanceOf(WrongPasscodeError);
    expect((await openKeyring(suite, next, 'second pass 2')).keyId).toBe(dataKey.keyId);
  });

  it('rejects malformed or weakened keyrings', async () => {
    // Stored keyrings must use at least 100k rounds, so this one uses the real minimum.
    const { keyring } = await createKeyring(suite, 'correct horse 42', { iterations: 100_000 });
    expect(parseKeyring(JSON.stringify(keyring))).toEqual(keyring);
    expect(parseKeyring('not json')).toBeNull();
    expect(parseKeyring(JSON.stringify({ ...keyring, iterations: 10 }))).toBeNull();
    expect(parseKeyring(JSON.stringify({ ...keyring, format: 'other' }))).toBeNull();
  });

  it('detects a keyring whose key was swapped', async () => {
    const a = await createKeyring(suite, 'correct horse 42', FAST);
    const b = await createKeyring(suite, 'correct horse 42', FAST);
    // b's locked key presented under a's fingerprint fails authentication.
    await expect(openKeyring(suite, { ...b.keyring, keyId: a.keyring.keyId }, 'correct horse 42')).rejects.toBeInstanceOf(
      WrongPasscodeError,
    );
  });

  it('formats the SQLCipher raw key', () => {
    const key = new Uint8Array(32).fill(0xab);
    expect(sqlcipherKey({ key, keyId: 'x' })).toBe(`"x'${'ab'.repeat(32)}'"`);
  });
});
