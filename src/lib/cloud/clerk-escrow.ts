import { createContext, useContext } from 'react';
import type { useUser } from '@clerk/expo';

import { isKeyRecord, type KeyEscrow, type KeyRecord } from './cloud-key';

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

/** Where in the account's metadata the Cloud key lives. */
const METADATA_KEY = 'clayhabitCloud';

/**
 * Keeps the Cloud key with the ClayHabbit (Clerk) account, in the user's
 * `unsafeMetadata` — the part of the account the app itself may write.
 * Clerk holds the key, Google holds the ciphertext; neither alone can read
 * the data.
 */
export function clerkKeyEscrow(user: ClerkUser): KeyEscrow {
  return {
    async read() {
      let metadata = user.unsafeMetadata;
      try {
        // Another phone may have just created the key; ask Clerk rather than trusting the cache.
        metadata = (await user.reload()).unsafeMetadata;
      } catch {
        // Offline: the cached account is the best answer available.
      }
      const value = metadata?.[METADATA_KEY];
      return isKeyRecord(value) ? value : null;
    },
    async write(record: KeyRecord) {
      await user.updateMetadata({ unsafeMetadata: { [METADATA_KEY]: record } });
    },
  };
}

/** The signed-in account's key escrow; null when sign-in isn't configured. */
export const KeyEscrowContext = createContext<KeyEscrow | null>(null);

export function useKeyEscrow(): KeyEscrow | null {
  return useContext(KeyEscrowContext);
}
