import * as SecureStore from 'expo-secure-store';

import { DATABASE_NAME } from '@/data/db/migrate';

/**
 * Every signed-in account gets its own on-device database, so two people
 * sharing a phone never see each other's tasks, notes or money.
 *
 * The first account to sign in on a device adopts the existing database
 * (`clayhabit.db`) — so anything recorded before sign-in was added is kept —
 * and every other account starts with a fresh file of its own.
 */

const OWNER_KEY = 'clayhabit.auth.deviceOwner';
const LAST_USER_KEY = 'clayhabit.auth.lastUserId';

/** Pure mapping, kept separate so it can be tested without a device. */
export function databaseNameFor(userId: string | null, ownerId: string | null): string {
  if (!userId || !ownerId || ownerId === userId) return DATABASE_NAME;
  const safe = userId.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64);
  return `clayhabit-${safe}.db`;
}

/** The database for `userId`, claiming the existing one if nobody has yet. */
export async function resolveDatabaseForUser(userId: string): Promise<string> {
  let owner = await SecureStore.getItemAsync(OWNER_KEY);
  if (!owner) {
    await SecureStore.setItemAsync(OWNER_KEY, userId);
    owner = userId;
  }
  return databaseNameFor(userId, owner);
}

/** Remembered so the app can still open offline, when Clerk can't confirm the session. */
export async function rememberLastUser(userId: string): Promise<void> {
  await SecureStore.setItemAsync(LAST_USER_KEY, userId);
}

export async function getLastUser(): Promise<string | null> {
  return SecureStore.getItemAsync(LAST_USER_KEY);
}

/** Called on an explicit sign-out, so offline start-up no longer lets that account in. */
export async function forgetLastUser(): Promise<void> {
  await SecureStore.deleteItemAsync(LAST_USER_KEY);
}
