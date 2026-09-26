import { createContext, useContext } from 'react';
import type { useUser } from '@clerk/expo';

import { isKeyRecord, type KeyRecord } from '../cloud/cloud-key';

type ClerkUser = NonNullable<ReturnType<typeof useUser>['user']>;

/** Where older versions kept data in the Clerk account; Clerk is sign-in only now. */
const LEGACY_KEYS = ['clayhabitCloud', 'clayhabitStorage'] as const;

/**
 * One-way cleanup of what older versions stored with the Clerk account (the
 * Cloud key and the storage choice). The old key is read only to open a Cloud
 * copy it sealed; once that copy is re-sealed under the passcode key, both
 * fields are deleted from Clerk for good.
 */
export interface LegacyClerkData {
  readCloudKey(): Promise<KeyRecord | null>;
  purge(): Promise<void>;
}

export function clerkLegacyData(user: ClerkUser): LegacyClerkData {
  return {
    async readCloudKey() {
      const value = user.unsafeMetadata?.[LEGACY_KEYS[0]];
      return isKeyRecord(value) ? value : null;
    },
    async purge() {
      const metadata = { ...(user.unsafeMetadata ?? {}) };
      if (!LEGACY_KEYS.some((key) => key in metadata)) return;
      for (const key of LEGACY_KEYS) delete metadata[key];
      // `update` replaces unsafeMetadata as a whole (unlike `updateMetadata`, which merges).
      await user.update({ unsafeMetadata: metadata });
    },
  };
}

export const LegacyClerkDataContext = createContext<LegacyClerkData | null>(null);

export function useLegacyClerkData(): LegacyClerkData | null {
  return useContext(LegacyClerkDataContext);
}
