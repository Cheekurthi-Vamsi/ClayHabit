import { requireOptionalNativeModule } from 'expo-modules-core';

interface ClayhabitKdfNative {
  pbkdf2Sha256(password: string, salt: Uint8Array, iterations: number, keyLength: number): Promise<Uint8Array>;
}

/** Null in Jest, on web and in Expo Go, where the native module isn't built in. */
export const nativeKdf = requireOptionalNativeModule<ClayhabitKdfNative>('ClayhabitKdf');
