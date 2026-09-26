import type { SQLiteDatabase } from 'expo-sqlite';

import type { Tag } from '@/domain/entities/tag';
import { generateId } from '@/utils/id';

interface TagRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

function toTag(row: TagRow): Tag {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

const TAG_PALETTE = ['#0A4174', '#49769F', '#4E8EA2', '#6EA2B3', '#3C84B5', '#6A8A1E'];

export async function listAll(db: SQLiteDatabase): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>('SELECT * FROM tags ORDER BY name ASC');
  return rows.map(toTag);
}

export async function listForTask(db: SQLiteDatabase, taskId: string): Promise<Tag[]> {
  const rows = await db.getAllAsync<TagRow>(
    `SELECT tags.* FROM tags
     INNER JOIN task_tags ON task_tags.tag_id = tags.id
     WHERE task_tags.task_id = ?
     ORDER BY tags.name ASC`,
    taskId,
  );
  return rows.map(toTag);
}

export async function findOrCreateByName(db: SQLiteDatabase, name: string): Promise<Tag> {
  const trimmed = name.trim();
  const existing = await db.getFirstAsync<TagRow>('SELECT * FROM tags WHERE name = ?', trimmed);
  if (existing) return toTag(existing);

  const id = generateId();
  const now = new Date().toISOString();
  const color = TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)];

  await db.runAsync(
    'INSERT INTO tags (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    id,
    trimmed,
    color,
    now,
  );

  return { id, name: trimmed, color, createdAt: now };
}

export async function setTagsForTask(
  db: SQLiteDatabase,
  taskId: string,
  tagIds: string[],
): Promise<void> {
  await db.runAsync('DELETE FROM task_tags WHERE task_id = ?', taskId);
  for (const tagId of tagIds) {
    await db.runAsync('INSERT INTO task_tags (task_id, tag_id) VALUES (?, ?)', taskId, tagId);
  }
}

export interface TagWithCount extends Tag {
  noteCount: number;
}

/** Tags used on at least one active note, with how many — for the Notes tag filter and picker. */
export async function listForNotes(db: SQLiteDatabase): Promise<TagWithCount[]> {
  const rows = await db.getAllAsync<TagRow & { note_count: number }>(
    `SELECT tags.*, COUNT(notes.id) AS note_count FROM tags
     INNER JOIN note_tags ON note_tags.tag_id = tags.id
     INNER JOIN notes ON notes.id = note_tags.note_id AND notes.is_trashed = 0 AND notes.is_archived = 0
     GROUP BY tags.id
     ORDER BY note_count DESC, tags.name COLLATE NOCASE ASC`,
  );
  return rows.map((row) => ({ ...toTag(row), noteCount: row.note_count }));
}
