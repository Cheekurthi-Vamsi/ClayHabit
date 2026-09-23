import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { NOTE_PAPERS, type NotePaper } from '@/domain/entities/note';

export type { NotePaper };

export type ThemePreference = 'light' | 'dark' | 'system';
export type NoteTextSize = 'small' | 'medium' | 'large';

export const NOTE_TEXT_SIZES: readonly NoteTextSize[] = ['small', 'medium', 'large'];
export type NotesViewMode = 'grid' | 'list';
export type NotesSort = 'updated' | 'created' | 'title';
const NOTES_SORTS: readonly NotesSort[] = ['updated', 'created', 'title'];
export const FOCUS_LENGTHS = [15, 25, 45, 50, 90] as const;

interface SettingsState {
  themePreference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  appLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  /** Highest streak milestone already celebrated, so each one only fires once. */
  lastCelebratedStreak: number;
  setLastCelebratedStreak: (days: number) => void;
  /** Privacy mode: every money amount renders masked (₹••,•••). */
  hideAmounts: boolean;
  setHideAmounts: (hidden: boolean) => void;
  /** Whether the productivity Home shows balance figures on its Finance card. Off by default. */
  showFinanceSummary: boolean;
  setShowFinanceSummary: (show: boolean) => void;
  /** Taps, toggles and chart scrubbing give a light vibration. */
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  /** Calmer screens: skips entrance and chart animations even if the system setting is off. */
  reduceMotion: boolean;
  setReduceMotion: (enabled: boolean) => void;
  /** Length the Focus timer starts with. */
  defaultFocusMinutes: number;
  setDefaultFocusMinutes: (minutes: number) => void;
  /** Paper for notes that haven't picked their own. */
  notePaper: NotePaper;
  setNotePaper: (paper: NotePaper) => void;
  noteTextSize: NoteTextSize;
  setNoteTextSize: (size: NoteTextSize) => void;
  /** Existing notes open formatted (tap to edit) rather than straight into the editor. */
  notesOpenInPreview: boolean;
  setNotesOpenInPreview: (enabled: boolean) => void;
  /** Notes privacy mode: lists show blurred bars instead of note previews. */
  notesHidePreviews: boolean;
  setNotesHidePreviews: (hidden: boolean) => void;
  notesViewMode: NotesViewMode;
  setNotesViewMode: (mode: NotesViewMode) => void;
  notesSort: NotesSort;
  setNotesSort: (sort: NotesSort) => void;
  /** Sync to the Cloud a few seconds after each change, not only on open, close and "Sync now". */
  cloudAutoSync: boolean;
  setCloudAutoSync: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Light is the flagship look; System/Dark stay one tap away in Settings.
      themePreference: 'light',
      setThemePreference: (preference) => set({ themePreference: preference }),
      displayName: '',
      setDisplayName: (name) => set({ displayName: name.trim().slice(0, 40) }),
      appLockEnabled: false,
      setAppLockEnabled: (enabled) => set({ appLockEnabled: enabled }),
      biometricEnabled: false,
      setBiometricEnabled: (enabled) => set({ biometricEnabled: enabled }),
      lastCelebratedStreak: 0,
      setLastCelebratedStreak: (days) => set({ lastCelebratedStreak: days }),
      hideAmounts: false,
      setHideAmounts: (hidden) => set({ hideAmounts: hidden }),
      showFinanceSummary: false,
      setShowFinanceSummary: (show) => set({ showFinanceSummary: show }),
      hapticsEnabled: true,
      setHapticsEnabled: (enabled) => set({ hapticsEnabled: enabled }),
      reduceMotion: false,
      setReduceMotion: (enabled) => set({ reduceMotion: enabled }),
      defaultFocusMinutes: 25,
      setDefaultFocusMinutes: (minutes) => set({ defaultFocusMinutes: minutes }),
      notePaper: 'grid',
      setNotePaper: (paper) => set({ notePaper: paper }),
      noteTextSize: 'medium',
      setNoteTextSize: (size) => set({ noteTextSize: size }),
      notesOpenInPreview: true,
      setNotesOpenInPreview: (enabled) => set({ notesOpenInPreview: enabled }),
      notesHidePreviews: false,
      setNotesHidePreviews: (hidden) => set({ notesHidePreviews: hidden }),
      notesViewMode: 'grid',
      setNotesViewMode: (mode) => set({ notesViewMode: mode }),
      notesSort: 'updated',
      setNotesSort: (sort) => set({ notesSort: sort }),
      cloudAutoSync: true,
      setCloudAutoSync: (enabled) => set({ cloudAutoSync: enabled }),
    }),
    {
      name: 'clayhabit.settings',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);

/**
 * `persist` rehydrates from AsyncStorage asynchronously, so a value like
 * `appLockEnabled` briefly reads as its default (false) on cold start. Gate
 * anything that must never render a stale default (the app-lock check in
 * particular) on this instead of assuming the store is ready immediately.
 */
export function useSettingsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(() => useSettingsStore.persist.hasHydrated());

  useEffect(() => {
    if (hydrated) return;
    return useSettingsStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  return hydrated;
}

/**
 * Preferences that follow the person to a new phone through the Cloud.
 * Device-specific ones stay put: App Lock and biometrics belong to this
 * phone's hardware and PIN.
 */
type SyncedSettings = Pick<
  SettingsState,
  | 'themePreference'
  | 'displayName'
  | 'hideAmounts'
  | 'showFinanceSummary'
  | 'lastCelebratedStreak'
  | 'hapticsEnabled'
  | 'reduceMotion'
  | 'defaultFocusMinutes'
  | 'notePaper'
  | 'noteTextSize'
  | 'notesOpenInPreview'
  | 'notesHidePreviews'
  | 'notesViewMode'
  | 'notesSort'
  | 'cloudAutoSync'
>;

const SYNCED_VALIDATORS: { [K in keyof SyncedSettings]: (value: unknown) => boolean } = {
  themePreference: (value) => value === 'light' || value === 'dark' || value === 'system',
  displayName: (value) => typeof value === 'string' && value.length <= 40,
  hideAmounts: (value) => typeof value === 'boolean',
  showFinanceSummary: (value) => typeof value === 'boolean',
  lastCelebratedStreak: (value) => typeof value === 'number' && Number.isFinite(value) && value >= 0,
  hapticsEnabled: (value) => typeof value === 'boolean',
  reduceMotion: (value) => typeof value === 'boolean',
  defaultFocusMinutes: (value) => typeof value === 'number' && value >= 1 && value <= 240,
  notePaper: (value) => (NOTE_PAPERS as readonly unknown[]).includes(value),
  noteTextSize: (value) => (NOTE_TEXT_SIZES as readonly unknown[]).includes(value),
  notesOpenInPreview: (value) => typeof value === 'boolean',
  notesHidePreviews: (value) => typeof value === 'boolean',
  notesViewMode: (value) => value === 'grid' || value === 'list',
  notesSort: (value) => (NOTES_SORTS as readonly unknown[]).includes(value),
  cloudAutoSync: (value) => typeof value === 'boolean',
};

export function pickSyncedSettings(state: SettingsState = useSettingsStore.getState()): Record<string, unknown> {
  const picked: Record<string, unknown> = {};
  for (const key of Object.keys(SYNCED_VALIDATORS) as (keyof SyncedSettings)[]) picked[key] = state[key];
  return picked;
}

/** Applies preferences from the Cloud, ignoring anything unknown or malformed. */
export function applySyncedSettings(prefs: Record<string, unknown>): void {
  const next: Partial<SyncedSettings> = {};
  for (const key of Object.keys(SYNCED_VALIDATORS) as (keyof SyncedSettings)[]) {
    if (key in prefs && SYNCED_VALIDATORS[key](prefs[key])) {
      (next as Record<string, unknown>)[key] = prefs[key];
    }
  }
  useSettingsStore.setState(next);
}
