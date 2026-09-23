import * as Crypto from 'expo-crypto';

import { bytesToHex } from './encoding';
import type { CipherSuite } from './envelope';

/** The envelope's primitives on the phone: native SHA-256 and AES-256-GCM from expo-crypto. */
export const expoCipherSuite: CipherSuite = {
  async sha256Hex(bytes) {
    const digest = await Crypto.digest(Crypto.CryptoDigestAlgorithm.SHA256, bytes as Uint8Array<ArrayBuffer>);
    return bytesToHex(new Uint8Array(digest));
  },
  async seal(plaintext, keyBytes, aad) {
    const key = await Crypto.AESEncryptionKey.import(keyBytes);
    const sealed = await Crypto.aesEncryptAsync(plaintext, key, { additionalData: aad });
    return sealed.combined('base64');
  },
  async open(sealedBase64, keyBytes, aad) {
    const key = await Crypto.AESEncryptionKey.import(keyBytes);
    const sealed = Crypto.AESSealedData.fromCombined(sealedBase64);
    return Crypto.aesDecryptAsync(sealed, key, { additionalData: aad });
  },
  randomBytes(count) {
    return Crypto.getRandomBytes(count);
  },
};
