export interface Folder {
  id: string;
  name: string;
  color: string;
  /** A Feather icon name; null shows the default folder glyph. */
  icon: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface FolderWithCount extends Folder {
  noteCount: number;
}

export interface NewFolderInput {
  name: string;
  color: string;
  icon?: string | null;
}

export interface UpdateFolderInput {
  name?: string;
  color?: string;
  icon?: string | null;
}
