import type { Tag } from './tag';

/** Pastel paper tints; see theme/note-palette.ts. `yellow` is shown as "Cream". */
export const NOTE_COLORS = ['default', 'lavender', 'blue', 'mint', 'peach', 'yellow', 'pink', 'graphite'] as const;
export type NoteColor = (typeof NOTE_COLORS)[number];

export const NOTE_PAPERS = ['grid', 'lines', 'dots', 'plain'] as const;
export type NotePaper = (typeof NOTE_PAPERS)[number];

/** What kind of note it is — drives its icon, its template and the smart filters. */
export const NOTE_TYPES = ['standard', 'checklist', 'quick', 'meeting', 'idea', 'journal', 'study', 'project', 'code'] as const;
export type NoteType = (typeof NOTE_TYPES)[number];

export function isNoteColor(value: unknown): value is NoteColor {
  return (NOTE_COLORS as readonly unknown[]).includes(value);
}

export function isNotePaper(value: unknown): value is NotePaper {
  return (NOTE_PAPERS as readonly unknown[]).includes(value);
}

export function isNoteType(value: unknown): value is NoteType {
  return (NOTE_TYPES as readonly unknown[]).includes(value);
}

export interface Note {
  id: string;
  title: string;
  body: string;
  noteType: NoteType;
  folderId: string | null;
  color: NoteColor;
  /** Null follows the default paper in Settings. */
  paper: NotePaper | null;
  isPinned: boolean;
  isFavorite: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  /** Needs device authentication to open; its content never shows in lists or search. */
  isLocked: boolean;
  trashedAt: string | null;
  reminderAt: string | null;
  notificationId: string | null;
  /** Bumped on every edit, for record-level sync conflict checks. */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

/** A note as lists need it: no full body, just what a card shows. */
export interface NoteSummary extends Omit<Note, 'body'> {
  /** Plain-text preview. Empty for locked notes. */
  excerpt: string;
  tags: Tag[];
  checklist: { done: number; total: number };
}

export interface NewNoteInput {
  title?: string;
  body?: string;
  noteType?: NoteType;
  folderId?: string | null;
  color?: NoteColor;
  isPinned?: boolean;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  noteType?: NoteType;
  folderId?: string | null;
  color?: NoteColor;
  paper?: NotePaper | null;
}

export interface NoteRevision {
  id: string;
  noteId: string;
  title: string;
  body: string;
  createdAt: string;
}

export type NoteAttachmentType = 'image' | 'pdf' | 'document' | 'audio' | 'file';

/** Schema is in place (migration 12); picking and viewing files comes later. */
export interface NoteAttachment {
  id: string;
  noteId: string;
  type: NoteAttachmentType;
  uri: string;
  name: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string;
}
