import * as Crypto from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'clayhabit.app-lock.pin';
const ATTEMPTS_KEY = 'clayhabit.app-lock.attempts';

/** Free tries before the PIN pad starts making people wait. */
export const FREE_ATTEMPTS = 5;
const FIRST_LOCKOUT_MS = 30_000;
const MAX_LOCKOUT_MS = 15 * 60_000;

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function authenticateWithBiometrics(promptMessage = 'Unlock ClayHabbit'): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: 'Use PIN instead',
  });
  return result.success;
}

/** True when the phone has a screen lock (PIN, pattern, password or biometrics) the app can ask for. */
export async function hasDeviceSecurity(): Promise<boolean> {
  const level = await LocalAuthentication.getEnrolledLevelAsync().catch(() => LocalAuthentication.SecurityLevel.NONE);
  return level !== LocalAuthentication.SecurityLevel.NONE;
}

/** Biometrics, or the phone's own PIN/pattern/password as a fallback (Android BiometricPrompt, iOS LocalAuthentication). */
export async function authenticateWithDevice(promptMessage: string): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({ promptMessage, disableDeviceFallback: false });
  return result.success;
}

// ---- PIN, stored salted and hashed ---------------------------------------------------------------

async function hash(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);
}

function randomSalt(): string {
  return Array.from(Crypto.getRandomBytes(16), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function setPin(pin: string): Promise<void> {
  const salt = randomSalt();
  await SecureStore.setItemAsync(PIN_KEY, `sha256:${salt}:${await hash(pin, salt)}`);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}

async function matches(pin: string): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  if (stored === null) return false;
  const parts = stored.split(':');
  if (parts.length === 3 && parts[0] === 'sha256') return (await hash(pin, parts[1])) === parts[2];
  // A PIN saved by an older version, in plain text: check it, then store it hashed.
  if (stored !== pin) return false;
  await setPin(pin);
  return true;
}

interface AttemptState {
  failures: number;
  lockedUntil: number;
}

async function loadAttempts(): Promise<AttemptState> {
  try {
    const raw = await SecureStore.getItemAsync(ATTEMPTS_KEY);
    const parsed = raw ? (JSON.parse(raw) as AttemptState) : null;
    return parsed && typeof parsed.failures === 'number' ? parsed : { failures: 0, lockedUntil: 0 };
  } catch {
    return { failures: 0, lockedUntil: 0 };
  }
}

/** How long a lockout lasts after `failures` wrong PINs: none, then 30 s, doubling to 15 min. */
export function lockoutFor(failures: number): number {
  if (failures < FREE_ATTEMPTS) return 0;
  return Math.min(MAX_LOCKOUT_MS, FIRST_LOCKOUT_MS * 2 ** (failures - FREE_ATTEMPTS));
}

export type PinCheck = { ok: true } | { ok: false; waitMs: number };

/**
 * Checks a PIN with a growing delay after repeated misses, so a 4-digit PIN
 * can't be brute-forced by hand. The count survives app restarts.
 */
export async function checkPin(pin: string, now = Date.now()): Promise<PinCheck> {
  const attempts = await loadAttempts();
  if (attempts.lockedUntil > now) return { ok: false, waitMs: attempts.lockedUntil - now };

  if (await matches(pin)) {
    await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
    return { ok: true };
  }
  const failures = attempts.failures + 1;
  const waitMs = lockoutFor(failures);
  await SecureStore.setItemAsync(ATTEMPTS_KEY, JSON.stringify({ failures, lockedUntil: now + waitMs }));
  return { ok: false, waitMs };
}

/** Plain yes/no check (no lockout bookkeeping) — for confirming a PIN just typed twice. */
export async function verifyPin(pin: string): Promise<boolean> {
  return matches(pin);
}

export async function hasPin(): Promise<boolean> {
  const stored = await SecureStore.getItemAsync(PIN_KEY);
  return stored !== null;
}

export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(PIN_KEY);
  await SecureStore.deleteItemAsync(ATTEMPTS_KEY);
}
