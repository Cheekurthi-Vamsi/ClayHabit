import { webcrypto } from 'node:crypto';

import { utf8Encode } from '../encoding';
import { nodeCipherSuite } from '../testing/node-cipher-suite';
import { createWebCipherSuite } from '../web-cipher-suite';

// The browser and the phone must open each other's snapshots: the web suite is
// checked against the independent Node suite, which mirrors expo-crypto's layout.
const webSuite = createWebCipherSuite(webcrypto as unknown as Crypto);

const key = new Uint8Array(32).map((_, index) => index);
const aad = utf8Encode('clayhabit-cloud/1|user_1|abcd|data');
const plaintext = utf8Encode('SQLite format 3\u0000 … the whole database');

describe('web cipher suite', () => {
  it('opens what the phone format sealed', async () => {
    const sealed = await nodeCipherSuite.seal(plaintext, key, aad);
    expect(await webSuite.open(sealed, key, aad)).toEqual(plaintext);
  });

  it('seals what the phone format opens', async () => {
    const sealed = await webSuite.seal(plaintext, key, aad);
    expect(await nodeCipherSuite.open(sealed, key, aad)).toEqual(plaintext);
  });

  it('rejects a different account binding', async () => {
    const sealed = await webSuite.seal(plaintext, key, aad);
    await expect(webSuite.open(sealed, key, utf8Encode('clayhabit-cloud/1|user_2|abcd|data'))).rejects.toThrow();
  });

  it('hashes like the phone', async () => {
    expect(await webSuite.sha256Hex(plaintext)).toBe(await nodeCipherSuite.sha256Hex(plaintext));
  });
});
