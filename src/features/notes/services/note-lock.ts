import { authenticateWithDevice, hasDeviceSecurity, hasPin } from '@/lib/security/app-lock-service';

/**
 * How a locked note is opened on this phone:
 * - `device`: biometrics, or the phone's own PIN / pattern / password
 *   (Android BiometricPrompt + Keystore, iOS LocalAuthentication + Keychain).
 * - `pin`: the phone has no screen lock, but ClayHabbit's App Lock PIN is set.
 * - `none`: nothing to authenticate with, so notes can't be locked here yet.
 */
export type NoteLockMethod = 'device' | 'pin' | 'none';

export async function noteLockMethod(): Promise<NoteLockMethod> {
  if (await hasDeviceSecurity()) return 'device';
  if (await hasPin()) return 'pin';
  return 'none';
}

/** Device prompt only; the PIN path is handled on screen by LockedNoteView. */
export async function authenticateForNote(reason: string): Promise<boolean> {
  try {
    return await authenticateWithDevice(reason);
  } catch {
    return false;
  }
}

export const NO_LOCK_METHOD_MESSAGE =
  "To lock notes, set a screen lock on this phone (PIN, pattern or fingerprint) or turn on App Lock in Settings → Security.";
