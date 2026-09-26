import { base64ToBytes, bytesToBase64, bytesToHex } from './encoding';
import type { CipherSuite } from './envelope';

// Our buffers are never shared memory; TypeScript just can't know that.
const buffer = (bytes: Uint8Array) => bytes as Uint8Array<ArrayBuffer>;

const NONCE_BYTES = 12;

/**
 * The envelope's primitives on WebCrypto (browsers, and Node in tests):
 * AES-256-GCM and SHA-256, with the same nonce ‖ ciphertext ‖ tag layout as
 * expo-crypto's `combined()`, so the phone and the web open each other's snapshots.
 */
export function createWebCipherSuite(crypto: Crypto = globalThis.crypto): CipherSuite {
  const { subtle } = crypto;
  return {
    async sha256Hex(bytes) {
      return bytesToHex(new Uint8Array(await subtle.digest('SHA-256', buffer(bytes))));
    },
    async seal(plaintext, keyBytes, aad) {
      const key = await subtle.importKey('raw', buffer(keyBytes), 'AES-GCM', false, ['encrypt']);
      const iv = crypto.getRandomValues(new Uint8Array(NONCE_BYTES));
      const sealed = new Uint8Array(
        await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: buffer(aad), tagLength: 128 }, key, buffer(plaintext)),
      );
      const combined = new Uint8Array(iv.length + sealed.length);
      combined.set(iv);
      combined.set(sealed, iv.length);
      return bytesToBase64(combined);
    },
    async open(sealedBase64, keyBytes, aad) {
      const combined = base64ToBytes(sealedBase64);
      const key = await subtle.importKey('raw', buffer(keyBytes), 'AES-GCM', false, ['decrypt']);
      const plain = await subtle.decrypt(
        { name: 'AES-GCM', iv: combined.slice(0, NONCE_BYTES), additionalData: buffer(aad), tagLength: 128 },
        key,
        buffer(combined.slice(NONCE_BYTES)),
      );
      return new Uint8Array(plain);
    },
    randomBytes(count) {
      return crypto.getRandomValues(new Uint8Array(count));
    },
  };
}
