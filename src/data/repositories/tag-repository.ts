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

const TAG_PALETTE = ['#6C5CE7', '#3E8BFF', '#22B8D0', '#22C79A', '#E39A1B', '#E9535A'];

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
