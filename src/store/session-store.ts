import { create } from 'zustand';

/**
 * Short-lived, in-memory UI state for this app session (never persisted).
 *
 * `welcome` is raised when someone has just signed in or finished setting up
 * where their data lives, so the home screen can greet them once.
 */
export type WelcomeReason = 'signed-in' | 'cloud-ready' | 'device-ready';

interface SessionState {
  welcome: WelcomeReason | null;
  showWelcome: (reason: WelcomeReason) => void;
  clearWelcome: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  welcome: null,
  showWelcome: (reason) => set({ welcome: reason }),
  clearWelcome: () => set({ welcome: null }),
}));
