import type { SQLiteDatabase } from 'expo-sqlite';

import type { Folder, FolderWithCount, NewFolderInput, UpdateFolderInput } from '@/domain/entities/folder';
import { generateId } from '@/utils/id';

interface FolderRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  sort_order: number | null;
  created_at: string;
}

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    icon: row.icon ?? null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

const ORDER = 'ORDER BY folders.sort_order ASC, folders.name COLLATE NOCASE ASC';

export async function listAll(db: SQLiteDatabase): Promise<Folder[]> {
  const rows = await db.getAllAsync<FolderRow>(`SELECT * FROM folders ${ORDER}`);
  return rows.map(toFolder);
}

/** Folders with how many active (not archived or trashed) notes each holds. */
export async function listWithCounts(db: SQLiteDatabase): Promise<FolderWithCount[]> {
  const rows = await db.getAllAsync<FolderRow & { note_count: number }>(
    `SELECT folders.*, (
       SELECT COUNT(*) FROM notes
       WHERE notes.folder_id = folders.id AND notes.is_trashed = 0 AND notes.is_archived = 0
     ) AS note_count
     FROM folders ${ORDER}`,
  );
  return rows.map((row) => ({ ...toFolder(row), noteCount: row.note_count }));
}

export async function create(db: SQLiteDatabase, input: NewFolderInput): Promise<Folder> {
  const id = generateId();
  const now = new Date().toISOString();
  const last = await db.getFirstAsync<{ max: number | null }>('SELECT MAX(sort_order) AS max FROM folders');
  const sortOrder = (last?.max ?? -1) + 1;

  await db.runAsync(
    'INSERT INTO folders (id, name, color, icon, sort_order, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    id,
    input.name.trim(),
    input.color,
    input.icon ?? null,
    sortOrder,
    now,
  );

  return { id, name: input.name.trim(), color: input.color, icon: input.icon ?? null, sortOrder, createdAt: now };
}

export async function update(db: SQLiteDatabase, id: string, input: UpdateFolderInput): Promise<void> {
  const row = await db.getFirstAsync<FolderRow>('SELECT * FROM folders WHERE id = ?', id);
  if (!row) return;
  await db.runAsync(
    'UPDATE folders SET name = ?, color = ?, icon = ? WHERE id = ?',
    input.name !== undefined ? input.name.trim() : row.name,
    input.color ?? row.color,
    input.icon !== undefined ? input.icon : row.icon,
    id,
  );
}

/** Deletes the folder. Its notes stay, just without a folder (the FK is ON DELETE SET NULL). */
export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE notes SET folder_id = NULL WHERE folder_id = ?', id);
  await db.runAsync('DELETE FROM folders WHERE id = ?', id);
}

/** Saves a new manual order: `ids` from first to last. */
export async function reorder(db: SQLiteDatabase, ids: string[]): Promise<void> {
  for (let index = 0; index < ids.length; index++) {
    await db.runAsync('UPDATE folders SET sort_order = ? WHERE id = ?', index, ids[index]);
  }
}
