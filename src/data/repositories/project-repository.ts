import type { SQLiteDatabase } from 'expo-sqlite';

import type { NewProjectInput, Project } from '@/domain/entities/project';
import { generateId } from '@/utils/id';

interface ProjectRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  created_at: string;
}

function toProject(row: ProjectRow): Project {
  return { id: row.id, name: row.name, color: row.color, icon: row.icon, createdAt: row.created_at };
}

export async function listAll(db: SQLiteDatabase): Promise<Project[]> {
  const rows = await db.getAllAsync<ProjectRow>('SELECT * FROM projects ORDER BY name ASC');
  return rows.map(toProject);
}

export async function create(db: SQLiteDatabase, input: NewProjectInput): Promise<Project> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO projects (id, name, color, icon, created_at) VALUES (?, ?, ?, ?, ?)',
    id,
    input.name.trim(),
    input.color,
    input.icon ?? null,
    now,
  );

  return { id, name: input.name.trim(), color: input.color, icon: input.icon ?? null, createdAt: now };
}
