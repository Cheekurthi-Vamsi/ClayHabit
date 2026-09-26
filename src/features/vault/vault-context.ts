import { createContext, useContext } from 'react';

import type { StorageMode } from '@/lib/storage/storage-mode';
import type { DataKey, Keyring } from '@/lib/vault/keyring';

export type PasscodeCheck = { ok: true } | { ok: false; waitMs: number };

export interface VaultApi {
  scope: string;
  /** The unlocked data key: SQLCipher key for this phone and AES key for the Cloud copy. */
  dataKey: DataKey;
  storageMode: StorageMode;
  /** Whether Cloud (Google Drive) can be offered in this build. */
  cloudAvailable: boolean;
  setStorageMode(mode: StorageMode): Promise<void>;
  /** Checks the passcode against this phone's keyring, with the lockout. */
  verifyPasscode(passcode: string): Promise<PasscodeCheck>;
  /** Re-locks the same data key under a new passcode, here and in the Cloud. */
  changePasscode(current: string, next: string): Promise<PasscodeCheck>;
  /** Switches to the Cloud's key (its keyring unlocked with the Cloud passcode) and re-keys this phone. */
  adoptDataKey(dataKey: DataKey, keyring: Keyring): Promise<void>;
  /** Forgets the unlocked key on this phone (sign-out); the passcode brings it back. */
  lock(): Promise<void>;
}

export const VaultContext = createContext<VaultApi | null>(null);

export function useVault(): VaultApi {
  const vault = useContext(VaultContext);
  if (!vault) throw new Error('useVault must be used inside the VaultGate');
  return vault;
}
