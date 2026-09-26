import { useSyncExternalStore } from 'react';

/**
 * Light or dark. index.html sets `data-theme` before the first paint (saved
 * choice, else the system's), so nothing flashes; this keeps it in step.
 */
export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'clayhabit.theme';
const listeners = new Set<() => void>();

function current(): ThemeName {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function apply(theme: ThemeName) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((meta) => meta.setAttribute('content', theme === 'dark' ? '#0E1012' : '#F1F5F8'));
  listeners.forEach((listener) => listener());
}

export function setTheme(theme: ThemeName) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Private mode: the choice lasts for this visit.
  }
  apply(theme);
}

// Follow the system until the person picks a theme themselves.
if (typeof window !== 'undefined') {
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }
    if (!saved) apply(event.matches ? 'dark' : 'light');
  });
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    current,
    () => 'light' as ThemeName,
  );
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark'), setTheme };
}
