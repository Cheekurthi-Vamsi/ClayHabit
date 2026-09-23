import { createContext, useContext } from 'react';
import type { useUser } from '@clerk/expo';

import { isStorageMode, type StorageModeRemote } from '@/lib/storage/storage-mode';

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

const METADATA_KEY = 'clayhabitStorage';

/** Keeps the Cloud-or-phone choice with the Clerk account (`unsafeMetadata`, deep-merged). */
export function clerkStorageModeRemote(user: ClerkUser): StorageModeRemote {
  return {
    async read() {
      let metadata = user.unsafeMetadata;
      try {
        metadata = (await user.reload()).unsafeMetadata;
      } catch {
        // Offline: use the cached account.
      }
      const value = metadata?.[METADATA_KEY];
      return isStorageMode(value) ? value : null;
    },
    async write(mode) {
      await user.updateMetadata({ unsafeMetadata: { [METADATA_KEY]: mode } });
    },
  };
}

export const StorageModeRemoteContext = createContext<StorageModeRemote | null>(null);

export function useStorageModeRemote(): StorageModeRemote | null {
  return useContext(StorageModeRemoteContext);
}
