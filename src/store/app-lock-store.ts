import { create } from 'zustand';

/**
 * Ephemeral (not persisted) session-unlock flag. Separate from
 * settingsStore's `appLockEnabled` preference: this tracks whether the
 * *current* app session has already been unlocked, so re-authenticating
 * right after setting up a PIN doesn't immediately re-lock the user.
 */
interface AppLockState {
  isSessionUnlocked: boolean;
  setSessionUnlocked: (value: boolean) => void;
}

export const useAppLockStore = create<AppLockState>((set) => ({
  isSessionUnlocked: false,
  setSessionUnlocked: (value) => set({ isSessionUnlocked: value }),
}));
