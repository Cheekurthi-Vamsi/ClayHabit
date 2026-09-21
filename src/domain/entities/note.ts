import type { Tag } from './tag';

export interface Note {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  isPinned: boolean;
  isArchived: boolean;
  isTrashed: boolean;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NoteWithTags extends Note {
  tags: Tag[];
}

export interface NewNoteInput {
  title?: string;
  body?: string;
  folderId?: string | null;
}

export interface UpdateNoteInput {
  title?: string;
  body?: string;
  folderId?: string | null;
}
