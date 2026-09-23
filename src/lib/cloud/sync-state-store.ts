import AsyncStorage from '@react-native-async-storage/async-storage';

import { EMPTY_SYNC_STATE, type SyncState, type SyncStateStore } from './sync-engine';

/** Bookkeeping only (ids, hashes, timestamps) — nothing secret, so AsyncStorage is enough. */
export function createSyncStateStore(scope: string): SyncStateStore {
  const key = `clayhabit.cloud.sync.${scope}`;
  return {
    async load() {
      try {
        const raw = await AsyncStorage.getItem(key);
        return raw ? { ...EMPTY_SYNC_STATE, ...(JSON.parse(raw) as Partial<SyncState>) } : EMPTY_SYNC_STATE;
      } catch {
        return EMPTY_SYNC_STATE;
      }
    },
    async save(state) {
      await AsyncStorage.setItem(key, JSON.stringify(state));
    },
  };
}

export async function clearSyncState(scope: string): Promise<void> {
  await AsyncStorage.removeItem(`clayhabit.cloud.sync.${scope}`);
}
