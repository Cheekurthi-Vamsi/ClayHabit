import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewNoteInput, Note, NoteWithTags, UpdateNoteInput } from '@/domain/entities/note';
import type { Tag } from '@/domain/entities/tag';
import { generateId } from '@/utils/id';

interface NoteRow {
  id: string;
  title: string;
  body: string;
  folder_id: string | null;
  is_pinned: number;
  is_archived: number;
  is_trashed: number;
  trashed_at: string | null;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    folderId: row.folder_id,
    isPinned: row.is_pinned === 1,
    isArchived: row.is_archived === 1,
    isTrashed: row.is_trashed === 1,
    trashedAt: row.trashed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NoteView = 'active' | 'archived' | 'trashed';

interface ListOptions {
  view?: NoteView;
  folderId?: string;
}

export async function listAll(db: SQLiteDatabase, options: ListOptions = {}): Promise<Note[]> {
  const view = options.view ?? 'active';
  const conditions =
    view === 'trashed'
      ? ['is_trashed = 1']
      : view === 'archived'
        ? ['is_trashed = 0', 'is_archived = 1']
        : ['is_trashed = 0', 'is_archived = 0'];
  const params: string[] = [];

  if (options.folderId) {
    conditions.push('folder_id = ?');
    params.push(options.folderId);
  }

  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes WHERE ${conditions.join(' AND ')} ORDER BY is_pinned DESC, updated_at DESC`,
    ...params,
  );
  return rows.map(toNote);
}

export async function search(db: SQLiteDatabase, query: string): Promise<Note[]> {
  const like = `%${query.trim()}%`;
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT * FROM notes
     WHERE is_trashed = 0 AND (title LIKE ? OR body LIKE ?)
     ORDER BY is_pinned DESC, updated_at DESC`,
    like,
    like,
  );
  return rows.map(toNote);
}

export async function getById(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? toNote(row) : null;
}

interface TagRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

export async function getWithTags(db: SQLiteDatabase, id: string): Promise<NoteWithTags | null> {
  const note = await getById(db, id);
  if (!note) return null;

  const tagRows = await db.getAllAsync<TagRow>(
    `SELECT tags.* FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     WHERE note_tags.note_id = ?
     ORDER BY tags.name ASC`,
    id,
  );

  return { ...note, tags: tagRows.map(toTag) };
}

export async function create(db: SQLiteDatabase, input: NewNoteInput = {}): Promise<Note> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO notes (id, title, body, folder_id, is_pinned, is_archived, is_trashed, trashed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 0, 0, NULL, ?, ?)`,
    id,
    input.title ?? '',
    input.body ?? '',
    input.folderId ?? null,
    now,
    now,
  );

  return {
    id,
    title: input.title ?? '',
    body: input.body ?? '',
    folderId: input.folderId ?? null,
    isPinned: false,
    isArchived: false,
    isTrashed: false,
    trashedAt: null,
    createdAt: now,
    updatedAt: now,
  };
}

export async function update(db: SQLiteDatabase, id: string, input: UpdateNoteInput): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) return;

  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, folder_id = ?, updated_at = ? WHERE id = ?',
    input.title ?? existing.title,
    input.body ?? existing.body,
    input.folderId !== undefined ? input.folderId : existing.folderId,
    new Date().toISOString(),
    id,
  );
}

export async function setPinned(db: SQLiteDatabase, id: string, isPinned: boolean): Promise<void> {
  await db.runAsync('UPDATE notes SET is_pinned = ? WHERE id = ?', isPinned ? 1 : 0, id);
}

export async function setArchived(db: SQLiteDatabase, id: string, isArchived: boolean): Promise<void> {
  await db.runAsync('UPDATE notes SET is_archived = ? WHERE id = ?', isArchived ? 1 : 0, id);
}

export async function moveToTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE notes SET is_trashed = 1, trashed_at = ? WHERE id = ?',
    new Date().toISOString(),
    id,
  );
}

export async function restoreFromTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE notes SET is_trashed = 0, trashed_at = NULL WHERE id = ?', id);
}

export async function permanentlyDelete(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export async function emptyTrash(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE is_trashed = 1');
}

export async function setTags(db: SQLiteDatabase, noteId: string, tagIds: string[]): Promise<void> {
  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
  for (const tagId of tagIds) {
    await db.runAsync('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', noteId, tagId);
  }
}
