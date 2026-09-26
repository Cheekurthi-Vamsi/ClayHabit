import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

import { nativeKdf } from '../../../modules/clayhabit-kdf';

/**
 * PBKDF2-HMAC-SHA256: stretches a passcode into a 256-bit key-encryption key.
 * On the phone it runs natively (the local `clayhabit-kdf` module) and in the
 * browser on WebCrypto, because hundreds of thousands of rounds are far too
 * slow in JavaScript; Expo Go falls back to the audited @noble/hashes implementation.
 */
export async function pbkdf2Sha256(passcode: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  // One canonical form, so the same passcode typed on another keyboard derives the same key.
  const normalized = passcode.normalize('NFKC');
  if (nativeKdf) {
    return new Uint8Array(await nativeKdf.pbkdf2Sha256(normalized, salt, iterations, 32));
  }
  const subtle = globalThis.crypto?.subtle;
  if (subtle) {
    const material = await subtle.importKey('raw', new TextEncoder().encode(normalized), 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations },
      material,
      256,
    );
    return new Uint8Array(bits);
  }
  return pbkdf2Async(sha256, normalized, salt, { c: iterations, dkLen: 32 });
}
