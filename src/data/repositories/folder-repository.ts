import type { SQLiteDatabase } from 'expo-sqlite';

import type { Folder, NewFolderInput } from '@/domain/entities/folder';
import { generateId } from '@/utils/id';

interface FolderRow {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

function toFolder(row: FolderRow): Folder {
  return { id: row.id, name: row.name, color: row.color, createdAt: row.created_at };
}

export async function listAll(db: SQLiteDatabase): Promise<Folder[]> {
  const rows = await db.getAllAsync<FolderRow>('SELECT * FROM folders ORDER BY name ASC');
  return rows.map(toFolder);
}

export async function create(db: SQLiteDatabase, input: NewFolderInput): Promise<Folder> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO folders (id, name, color, created_at) VALUES (?, ?, ?, ?)',
    id,
    input.name.trim(),
    input.color,
    now,
  );

  return { id, name: input.name.trim(), color: input.color, createdAt: now };
}
