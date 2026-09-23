import type { SQLiteDatabase } from 'expo-sqlite';

import {
  isNoteColor,
  isNotePaper,
  isNoteType,
  type NewNoteInput,
  type Note,
  type NoteRevision,
  type NoteSummary,
  type NoteWithTags,
  type UpdateNoteInput,
} from '@/domain/entities/note';
import type { Tag } from '@/domain/entities/tag';
import { generateId } from '@/utils/id';
import { bodyPreview } from '@/utils/markdown';
import { noteStats } from '@/utils/note-format';

interface NoteRow {
  id: string;
  title: string;
  body: string;
  note_type: string | null;
  folder_id: string | null;
  color: string | null;
  paper: string | null;
  is_pinned: number;
  is_favorite: number;
  is_archived: number;
  is_trashed: number;
  is_locked: number;
  trashed_at: string | null;
  reminder_at: string | null;
  notification_id: string | null;
  version: number | null;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    noteType: isNoteType(row.note_type) ? row.note_type : 'standard',
    folderId: row.folder_id,
    color: isNoteColor(row.color) ? row.color : 'default',
    paper: isNotePaper(row.paper) ? row.paper : null,
    isPinned: row.is_pinned === 1,
    isFavorite: row.is_favorite === 1,
    isArchived: row.is_archived === 1,
    isTrashed: row.is_trashed === 1,
    isLocked: row.is_locked === 1,
    trashedAt: row.trashed_at,
    reminderAt: row.reminder_at,
    notificationId: row.notification_id,
    version: row.version ?? 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

// ---- Listing ---------------------------------------------------------------------------------

export type NoteView = 'active' | 'archived' | 'trashed';

/** Smart filters on the Notes home. */
export type NoteFilter = 'all' | 'pinned' | 'favorites' | 'checklists' | 'code' | 'locked' | 'recent' | 'reminders';

export type NoteSort = 'updated' | 'created' | 'title';

export interface ListOptions {
  view?: NoteView;
  filter?: NoteFilter;
  folderId?: string;
  tagId?: string;
  sort?: NoteSort;
  limit?: number;
}

/** "Recent" means edited in the last week. */
const RECENT_DAYS = 7;

function orderBy(sort: NoteSort): string {
  switch (sort) {
    case 'created':
      return 'notes.is_pinned DESC, notes.created_at DESC';
    case 'title':
      return "notes.is_pinned DESC, CASE WHEN TRIM(notes.title) = '' THEN 1 ELSE 0 END, notes.title COLLATE NOCASE ASC";
    case 'updated':
      return 'notes.is_pinned DESC, notes.updated_at DESC';
  }
}

function listQuery(options: ListOptions): { where: string[]; params: (string | number)[] } {
  const view = options.view ?? 'active';
  const where =
    view === 'trashed'
      ? ['notes.is_trashed = 1']
      : view === 'archived'
        ? ['notes.is_trashed = 0', 'notes.is_archived = 1']
        : ['notes.is_trashed = 0', 'notes.is_archived = 0'];
  const params: (string | number)[] = [];

  switch (options.filter ?? 'all') {
    case 'pinned':
      where.push('notes.is_pinned = 1');
      break;
    case 'favorites':
      where.push('notes.is_favorite = 1');
      break;
    case 'checklists':
      where.push("(notes.note_type = 'checklist' OR notes.body LIKE '%- [ ]%' OR notes.body LIKE '%- [x]%')");
      break;
    case 'code':
      where.push("(notes.note_type = 'code' OR notes.body LIKE '%```%')");
      break;
    case 'locked':
      where.push('notes.is_locked = 1');
      break;
    case 'reminders':
      where.push('notes.reminder_at IS NOT NULL');
      break;
    case 'recent':
      where.push('notes.updated_at >= ?');
      params.push(new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString());
      break;
    case 'all':
      break;
  }

  if (options.folderId) {
    where.push('notes.folder_id = ?');
    params.push(options.folderId);
  }
  if (options.tagId) {
    where.push('EXISTS (SELECT 1 FROM note_tags nt WHERE nt.note_id = notes.id AND nt.tag_id = ?)');
    params.push(options.tagId);
  }
  return { where, params };
}

/** Full notes (with body). Prefer `listSummaries` for anything that renders a list. */
export async function listAll(db: SQLiteDatabase, options: ListOptions = {}): Promise<Note[]> {
  const { where, params } = listQuery(options);
  const limit = options.limit ? ` LIMIT ${Math.max(1, Math.floor(options.limit))}` : '';
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT notes.* FROM notes WHERE ${where.join(' AND ')} ORDER BY ${orderBy(options.sort ?? 'updated')}${limit}`,
    ...params,
  );
  return rows.map(toNote);
}

/** Tags for many notes in one query, keyed by note id. */
async function tagsByNote(db: SQLiteDatabase, noteIds: string[]): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  if (noteIds.length === 0) return map;
  const rows = await db.getAllAsync<TagRow & { note_id: string }>(
    `SELECT note_tags.note_id, tags.* FROM note_tags
     INNER JOIN tags ON tags.id = note_tags.tag_id
     ORDER BY tags.name COLLATE NOCASE ASC`,
  );
  const wanted = new Set(noteIds);
  for (const row of rows) {
    if (!wanted.has(row.note_id)) continue;
    const list = map.get(row.note_id) ?? [];
    list.push(toTag(row));
    map.set(row.note_id, list);
  }
  return map;
}

/** What a card needs. Locked notes never expose their text here. */
export function summarize(note: Note, tags: Tag[]): NoteSummary {
  const { body, ...rest } = note;
  return {
    ...rest,
    excerpt: note.isLocked ? '' : bodyPreview(body, { maxLength: 180 }),
    tags,
    checklist: note.isLocked ? { done: 0, total: 0 } : noteStats(body).checklist,
  };
}

export async function listSummaries(db: SQLiteDatabase, options: ListOptions = {}): Promise<NoteSummary[]> {
  const notes = await listAll(db, options);
  const tags = await tagsByNote(
    db,
    notes.map((note) => note.id),
  );
  return notes.map((note) => summarize(note, tags.get(note.id) ?? []));
}

/**
 * Search across title, body, folder name, tag names and note type.
 * Locked notes match on their title only — their content stays private.
 * Kept behind this function so it can move to SQLite FTS without touching the UI.
 */
export async function search(db: SQLiteDatabase, query: string): Promise<NoteSummary[]> {
  const term = query.trim();
  if (!term) return [];
  const like = `%${term.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
  const rows = await db.getAllAsync<NoteRow>(
    `SELECT notes.* FROM notes
     LEFT JOIN folders ON folders.id = notes.folder_id
     WHERE notes.is_trashed = 0 AND (
       notes.title LIKE ?1 ESCAPE '\\'
       OR (notes.is_locked = 0 AND notes.body LIKE ?1 ESCAPE '\\')
       OR folders.name LIKE ?1 ESCAPE '\\'
       OR notes.note_type LIKE ?1 ESCAPE '\\'
       OR EXISTS (
         SELECT 1 FROM note_tags nt INNER JOIN tags t ON t.id = nt.tag_id
         WHERE nt.note_id = notes.id AND t.name LIKE ?1 ESCAPE '\\'
       )
     )
     ORDER BY notes.is_pinned DESC, notes.updated_at DESC
     LIMIT 200`,
    like,
  );
  const notes = rows.map(toNote);
  const tags = await tagsByNote(
    db,
    notes.map((note) => note.id),
  );
  return notes.map((note) => summarize(note, tags.get(note.id) ?? []));
}

export interface NoteCounts {
  all: number;
  pinned: number;
  favorites: number;
  locked: number;
  archived: number;
  trashed: number;
}

export async function counts(db: SQLiteDatabase): Promise<NoteCounts> {
  const row = await db.getFirstAsync<Record<keyof NoteCounts, number | null>>(
    `SELECT
       SUM(CASE WHEN is_trashed = 0 AND is_archived = 0 THEN 1 ELSE 0 END) AS "all",
       SUM(CASE WHEN is_trashed = 0 AND is_archived = 0 AND is_pinned = 1 THEN 1 ELSE 0 END) AS pinned,
       SUM(CASE WHEN is_trashed = 0 AND is_archived = 0 AND is_favorite = 1 THEN 1 ELSE 0 END) AS favorites,
       SUM(CASE WHEN is_trashed = 0 AND is_archived = 0 AND is_locked = 1 THEN 1 ELSE 0 END) AS locked,
       SUM(CASE WHEN is_trashed = 0 AND is_archived = 1 THEN 1 ELSE 0 END) AS archived,
       SUM(CASE WHEN is_trashed = 1 THEN 1 ELSE 0 END) AS trashed
     FROM notes`,
  );
  return {
    all: row?.all ?? 0,
    pinned: row?.pinned ?? 0,
    favorites: row?.favorites ?? 0,
    locked: row?.locked ?? 0,
    archived: row?.archived ?? 0,
    trashed: row?.trashed ?? 0,
  };
}

// ---- Single notes ----------------------------------------------------------------------------

export async function getById(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const row = await db.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id);
  return row ? toNote(row) : null;
}

export async function getWithTags(db: SQLiteDatabase, id: string): Promise<NoteWithTags | null> {
  const note = await getById(db, id);
  if (!note) return null;

  const tagRows = await db.getAllAsync<TagRow>(
    `SELECT tags.* FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     WHERE note_tags.note_id = ?
     ORDER BY tags.name COLLATE NOCASE ASC`,
    id,
  );

  return { ...note, tags: tagRows.map(toTag) };
}

export async function create(db: SQLiteDatabase, input: NewNoteInput = {}): Promise<Note> {
  const id = generateId();
  const now = new Date().toISOString();
  const note: Note = {
    id,
    title: input.title?.trim() ?? '',
    body: input.body ?? '',
    noteType: input.noteType ?? 'standard',
    folderId: input.folderId ?? null,
    color: input.color ?? 'default',
    paper: null,
    isPinned: input.isPinned ?? false,
    isFavorite: false,
    isArchived: false,
    isTrashed: false,
    isLocked: false,
    trashedAt: null,
    reminderAt: null,
    notificationId: null,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO notes (
       id, title, body, note_type, folder_id, color, is_pinned, is_favorite, is_archived, is_trashed,
       is_locked, trashed_at, version, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 0, NULL, 1, ?, ?)`,
    id,
    note.title,
    note.body,
    note.noteType,
    note.folderId,
    note.color,
    note.isPinned ? 1 : 0,
    now,
    now,
  );
  return note;
}

/** How long after one snapshot a meaningful edit gets another. */
export const REVISION_INTERVAL_MS = 10 * 60_000;

/**
 * Saves any subset of a note's content. Title and body are written
 * independently, so autosaving one never overwrites the other. Before the
 * write, the previous content is kept as a revision if the last one is old
 * enough (not one per keystroke).
 */
export async function update(db: SQLiteDatabase, id: string, input: UpdateNoteInput): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) return;

  const nextTitle = input.title !== undefined ? input.title : existing.title;
  const nextBody = input.body !== undefined ? input.body : existing.body;
  if (nextTitle !== existing.title || nextBody !== existing.body) {
    await saveRevisionIfDue(db, existing);
  }

  await db.runAsync(
    `UPDATE notes SET title = ?, body = ?, note_type = ?, folder_id = ?, color = ?, paper = ?,
       version = version + 1, updated_at = ?
     WHERE id = ?`,
    nextTitle,
    nextBody,
    input.noteType ?? existing.noteType,
    input.folderId !== undefined ? input.folderId : existing.folderId,
    input.color ?? existing.color,
    input.paper !== undefined ? input.paper : existing.paper,
    new Date().toISOString(),
    id,
  );
}

async function setFlag(db: SQLiteDatabase, id: string, column: string, value: boolean): Promise<void> {
  await db.runAsync(`UPDATE notes SET ${column} = ?, version = version + 1 WHERE id = ?`, value ? 1 : 0, id);
}

export const setPinned = (db: SQLiteDatabase, id: string, value: boolean) => setFlag(db, id, 'is_pinned', value);
export const setFavorite = (db: SQLiteDatabase, id: string, value: boolean) => setFlag(db, id, 'is_favorite', value);
export const setArchived = (db: SQLiteDatabase, id: string, value: boolean) => setFlag(db, id, 'is_archived', value);
export const setLocked = (db: SQLiteDatabase, id: string, value: boolean) => setFlag(db, id, 'is_locked', value);

export async function moveToTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE notes SET is_trashed = 1, is_pinned = 0, trashed_at = ?, version = version + 1 WHERE id = ?',
    new Date().toISOString(),
    id,
  );
}

export async function restoreFromTrash(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE notes SET is_trashed = 0, trashed_at = NULL, version = version + 1 WHERE id = ?', id);
}

export async function permanentlyDelete(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE id = ?', id);
}

export async function emptyTrash(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM notes WHERE is_trashed = 1');
}

/** Trash empties itself: notes deleted more than `days` ago are removed for good. */
export const TRASH_RETENTION_DAYS = 30;

export async function purgeExpiredTrash(db: SQLiteDatabase, now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * 86_400_000).toISOString();
  const result = await db.runAsync('DELETE FROM notes WHERE is_trashed = 1 AND trashed_at < ?', cutoff);
  return result.changes;
}

/** A copy with the same content, folder, colour and tags — never pinned, locked or with a reminder. */
export async function duplicate(db: SQLiteDatabase, id: string): Promise<Note | null> {
  const source = await getWithTags(db, id);
  if (!source) return null;
  const copy = await create(db, {
    title: source.title.trim() ? `${source.title.trim()} (copy)` : '',
    body: source.body,
    noteType: source.noteType,
    folderId: source.folderId,
    color: source.color,
  });
  if (source.paper) await update(db, copy.id, { paper: source.paper });
  await setTags(
    db,
    copy.id,
    source.tags.map((tag) => tag.id),
  );
  return getById(db, copy.id);
}

export async function setTags(db: SQLiteDatabase, noteId: string, tagIds: string[]): Promise<void> {
  await db.runAsync('DELETE FROM note_tags WHERE note_id = ?', noteId);
  for (const tagId of new Set(tagIds)) {
    await db.runAsync('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)', noteId, tagId);
  }
}

// ---- Reminders -------------------------------------------------------------------------------

export async function setReminder(
  db: SQLiteDatabase,
  id: string,
  input: { at: string | null; notificationId: string | null },
): Promise<void> {
  await db.runAsync(
    'UPDATE notes SET reminder_at = ?, notification_id = ? WHERE id = ?',
    input.at,
    input.notificationId,
    id,
  );
}

/** Notes with a reminder still in the future — to reschedule after a restore. */
export async function listUpcomingReminders(db: SQLiteDatabase, now = new Date()): Promise<Note[]> {
  const rows = await db.getAllAsync<NoteRow>(
    'SELECT * FROM notes WHERE is_trashed = 0 AND reminder_at IS NOT NULL AND reminder_at > ?',
    now.toISOString(),
  );
  return rows.map(toNote);
}

// ---- Revisions -------------------------------------------------------------------------------

async function saveRevisionIfDue(db: SQLiteDatabase, note: Note): Promise<void> {
  if (!note.title.trim() && !note.body.trim()) return;
  const last = await db.getFirstAsync<{ created_at: string; title: string; body: string }>(
    'SELECT created_at, title, body FROM note_revisions WHERE note_id = ? ORDER BY created_at DESC LIMIT 1',
    note.id,
  );
  if (last && last.title === note.title && last.body === note.body) return;
  if (last && Date.now() - new Date(last.created_at).getTime() < REVISION_INTERVAL_MS) return;
  await db.runAsync(
    'INSERT INTO note_revisions (id, note_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)',
    generateId(),
    note.id,
    note.title,
    note.body,
    new Date().toISOString(),
  );
  // Keep history bounded: the newest 30 per note.
  await db.runAsync(
    `DELETE FROM note_revisions WHERE note_id = ?1 AND id NOT IN (
       SELECT id FROM note_revisions WHERE note_id = ?1 ORDER BY created_at DESC LIMIT 30
     )`,
    note.id,
  );
}

export async function listRevisions(db: SQLiteDatabase, noteId: string): Promise<NoteRevision[]> {
  const rows = await db.getAllAsync<{ id: string; note_id: string; title: string; body: string; created_at: string }>(
    'SELECT * FROM note_revisions WHERE note_id = ? ORDER BY created_at DESC',
    noteId,
  );
  return rows.map((row) => ({
    id: row.id,
    noteId: row.note_id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
  }));
}

/** Puts an old version back. The current one is kept as a revision first, so this can be undone. */
export async function restoreRevision(db: SQLiteDatabase, revisionId: string): Promise<void> {
  const revision = await db.getFirstAsync<{ note_id: string; title: string; body: string }>(
    'SELECT note_id, title, body FROM note_revisions WHERE id = ?',
    revisionId,
  );
  if (!revision) return;
  const current = await getById(db, revision.note_id);
  if (current) {
    await db.runAsync(
      'INSERT INTO note_revisions (id, note_id, title, body, created_at) VALUES (?, ?, ?, ?, ?)',
      generateId(),
      current.id,
      current.title,
      current.body,
      new Date().toISOString(),
    );
  }
  await db.runAsync(
    'UPDATE notes SET title = ?, body = ?, version = version + 1, updated_at = ? WHERE id = ?',
    revision.title,
    revision.body,
    new Date().toISOString(),
    revision.note_id,
  );
}
