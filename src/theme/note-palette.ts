import type { NoteColor } from '@/domain/entities/note';

export interface NoteSwatch {
  label: string;
  /** Card / paper background. Pastel in light mode, a deep tint in dark mode. */
  paper: string;
  /** A small, saturated dot for pickers and card accents. */
  accent: string;
}

/**
 * Note colours are organisational, not decoration: soft pastels that keep
 * text at full contrast (navy ink on light, near-white on dark).
 */
export const notePalette: Record<'light' | 'dark', Record<NoteColor, NoteSwatch>> = {
  light: {
    default: { label: 'Default', paper: '#FFFFFF', accent: '#8C93AD' },
    lavender: { label: 'Lavender', paper: '#F1EEFF', accent: '#7258F5' },
    blue: { label: 'Blue', paper: '#E9F2FE', accent: '#3A74E6' },
    mint: { label: 'Mint', paper: '#E5F6EF', accent: '#1FA985' },
    peach: { label: 'Peach', paper: '#FFEEE4', accent: '#E47A40' },
    yellow: { label: 'Cream', paper: '#FFF7E3', accent: '#D9A21B' },
    pink: { label: 'Rose', paper: '#FDEDF2', accent: '#DC5F84' },
    graphite: { label: 'Graphite', paper: '#ECEEF3', accent: '#4A5068' },
  },
  dark: {
    default: { label: 'Default', paper: '#181D36', accent: '#737A99' },
    lavender: { label: 'Lavender', paper: '#221F45', accent: '#9A88FF' },
    blue: { label: 'Blue', paper: '#16253F', accent: '#6FA3F7' },
    mint: { label: 'Mint', paper: '#12302A', accent: '#4FD3B0' },
    peach: { label: 'Peach', paper: '#30211A', accent: '#F29A6B' },
    yellow: { label: 'Cream', paper: '#2C2718', accent: '#E8C25A' },
    pink: { label: 'Rose', paper: '#301C27', accent: '#F28FAE' },
    graphite: { label: 'Graphite', paper: '#23262F', accent: '#9AA0B8' },
  },
};

/** Lines, dots and grid drawn on note paper and the Notes background. */
export const paperInk = {
  light: 'rgba(91, 79, 232, 0.11)',
  dark: 'rgba(170, 180, 240, 0.08)',
} as const;
