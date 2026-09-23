import { createHash, randomBytes, webcrypto } from 'node:crypto';

import { base64ToBytes, bytesToBase64 } from '../encoding';
import type { CipherSuite } from '../envelope';

// Our buffers are never shared memory; TypeScript just can't know that.
const buffer = (bytes: Uint8Array) => bytes as Uint8Array<ArrayBuffer>;

/**
 * The envelope's primitives implemented with Node's WebCrypto: real
 * AES-256-GCM and SHA-256, producing the same nonce ‖ ciphertext ‖ tag
 * layout as expo-crypto's `combined()`.
 */
export const nodeCipherSuite: CipherSuite = {
  async sha256Hex(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
  },
  async seal(plaintext, keyBytes, aad) {
    const key = await webcrypto.subtle.importKey('raw', buffer(keyBytes), 'AES-GCM', false, ['encrypt']);
    const iv = new Uint8Array(randomBytes(12));
    const sealed = new Uint8Array(
      await webcrypto.subtle.encrypt({ name: 'AES-GCM', iv: buffer(iv), additionalData: buffer(aad), tagLength: 128 }, key, buffer(plaintext)),
    );
    const combined = new Uint8Array(iv.length + sealed.length);
    combined.set(iv);
    combined.set(sealed, iv.length);
    return bytesToBase64(combined);
  },
  async open(sealedBase64, keyBytes, aad) {
    const combined = base64ToBytes(sealedBase64);
    const key = await webcrypto.subtle.importKey('raw', buffer(keyBytes), 'AES-GCM', false, ['decrypt']);
    const plain = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, 12), additionalData: buffer(aad), tagLength: 128 },
      key,
      buffer(combined.slice(12)),
    );
    return new Uint8Array(plain);
  },
  randomBytes(count) {
    return new Uint8Array(randomBytes(count));
  },
};
