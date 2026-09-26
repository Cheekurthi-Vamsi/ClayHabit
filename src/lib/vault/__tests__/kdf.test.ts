import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { pbkdf2Sha256 } from '../kdf';

jest.mock('../../../../modules/clayhabit-kdf', () => ({ nativeKdf: null }));

describe('pbkdf2Sha256 on WebCrypto', () => {
  it('derives the same key as the JS implementation the phone falls back to', async () => {
    const salt = new Uint8Array(16).map((_, index) => index * 7);
    const passcode = 'clay habit 2026';
    const expected = await pbkdf2Async(sha256, passcode.normalize('NFKC'), salt, { c: 2_000, dkLen: 32 });
    expect(globalThis.crypto?.subtle).toBeDefined();
    expect(await pbkdf2Sha256(passcode, salt, 2_000)).toEqual(expected);
  });
});
