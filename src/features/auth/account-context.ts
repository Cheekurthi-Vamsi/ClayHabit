import { createContext, useContext } from 'react';

export interface Account {
  userId: string;
  firstName: string | null;
  fullName: string | null;
  email: string | null;
  imageUrl: string | null;
  /** True while running on the remembered session because Clerk couldn't be reached. */
  offline: boolean;
}

/** The signed-in account, or null when sign-in isn't configured (local-only mode). */
export const AccountContext = createContext<Account | null>(null);

export function useAccount(): Account | null {
  return useContext(AccountContext);
}
