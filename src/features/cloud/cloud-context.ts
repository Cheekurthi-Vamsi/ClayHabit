import { createContext, useContext } from 'react';

import type { GoogleAccount } from '@/lib/cloud/google-account';
import type { RemoteSummary } from '@/lib/cloud/sync-engine';
import type { StorageMode } from '@/lib/storage/storage-mode';

/**
 * - `local-only`: Cloud isn't available in this build; data stays on the phone.
 * - `syncing` / `synced`: talking to, or in step with, the Cloud.
 * - `offline`: couldn't reach Google; changes wait on the phone.
 * - `error`: the last sync failed for another reason (see `error`).
 * - `conflict`: this phone and the Cloud both changed; waiting for a choice.
 */
export type CloudStatus = 'local-only' | 'syncing' | 'synced' | 'offline' | 'error' | 'conflict';

/** `device-only`: the person chose to keep this account's data on this phone. */
export type CloudUnavailableReason = 'not-configured' | 'needs-dev-build' | 'device-only';

export interface CloudApi {
  enabled: boolean;
  /** Where this account's data lives; null when the choice isn't offered in this build. */
  storageMode: StorageMode | null;
  /** Moves between phone-only and Cloud. Cloud → phone keeps the Drive copy but stops syncing. */
  setStorageMode(mode: StorageMode): Promise<void>;
  unavailableReason: CloudUnavailableReason | null;
  status: CloudStatus;
  account: GoogleAccount | null;
  lastSyncedAt: string | null;
  error: string | null;
  conflict: RemoteSummary | null;
  syncNow(): Promise<void>;
  resolveConflict(prefer: 'local' | 'remote'): Promise<void>;
  /** Signs out of Google and returns to the Connect screen (e.g. to switch accounts). */
  switchGoogleAccount(): Promise<void>;
  /** Called before signing out of ClayHabbit: last sync, then forget Google on this phone. */
  prepareSignOut(): Promise<void>;
}

const noop = async () => {};

export function localOnlyCloud(
  reason: CloudUnavailableReason,
  overrides: Partial<Pick<CloudApi, 'setStorageMode' | 'prepareSignOut'>> = {},
): CloudApi {
  return {
    enabled: false,
    storageMode: reason === 'device-only' ? 'device' : null,
    setStorageMode: noop,
    unavailableReason: reason,
    status: 'local-only',
    account: null,
    lastSyncedAt: null,
    error: null,
    conflict: null,
    syncNow: noop,
    resolveConflict: noop,
    switchGoogleAccount: noop,
    prepareSignOut: noop,
    ...overrides,
  };
}

export const CloudContext = createContext<CloudApi>(localOnlyCloud('not-configured'));

export function useCloud(): CloudApi {
  return useContext(CloudContext);
}
