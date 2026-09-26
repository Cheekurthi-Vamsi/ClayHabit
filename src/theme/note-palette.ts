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
  // Keys are stored on saved notes; the labels and colours follow the app palette.
  light: {
    default: { label: 'Default', paper: '#FFFFFF', accent: '#6A8BA3' },
    lavender: { label: 'Sky', paper: '#E8F3FB', accent: '#7BBDE8' },
    blue: { label: 'Steel', paper: '#E6EEF5', accent: '#49769F' },
    mint: { label: 'Teal', paper: '#E3F0F3', accent: '#4E8EA2' },
    peach: { label: 'Lime', paper: '#F4FAD9', accent: '#8FAE22' },
    yellow: { label: 'Sea', paper: '#EAF3F5', accent: '#6EA2B3' },
    pink: { label: 'Navy', paper: '#DCE7F1', accent: '#0A4174' },
    graphite: { label: 'Graphite', paper: '#ECEDEF', accent: '#3A3C40' },
  },
  dark: {
    default: { label: 'Default', paper: '#18191C', accent: '#6F8797' },
    lavender: { label: 'Sky', paper: '#12283A', accent: '#7BBDE8' },
    blue: { label: 'Steel', paper: '#16222E', accent: '#8FB3D3' },
    mint: { label: 'Teal', paper: '#11272C', accent: '#4E8EA2' },
    peach: { label: 'Lime', paper: '#252B12', accent: '#CFF400' },
    yellow: { label: 'Sea', paper: '#142629', accent: '#6EA2B3' },
    pink: { label: 'Navy', paper: '#0C1E33', accent: '#BDD8E9' },
    graphite: { label: 'Graphite', paper: '#222326', accent: '#9A9DA3' },
  },
};

/** Lines, dots and grid drawn on note paper and the Notes background. */
export const paperInk = {
  light: 'rgba(10, 65, 116, 0.10)',
  dark: 'rgba(189, 216, 233, 0.07)',
} as const;
