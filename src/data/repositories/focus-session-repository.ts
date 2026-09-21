import type { SQLiteDatabase } from 'expo-sqlite';

import type { FocusSession, NewFocusSessionInput } from '@/domain/entities/focus-session';
import { generateId } from '@/utils/id';

interface FocusSessionRow {
  id: string;
  task_id: string | null;
  planned_minutes: number;
  actual_minutes: number | null;
  started_at: string;
  ended_at: string | null;
  is_completed: number;
}

function toSession(row: FocusSessionRow): FocusSession {
  return {
    id: row.id,
    taskId: row.task_id,
    plannedMinutes: row.planned_minutes,
    actualMinutes: row.actual_minutes,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    isCompleted: row.is_completed === 1,
  };
}

export async function start(db: SQLiteDatabase, input: NewFocusSessionInput): Promise<FocusSession> {
  const id = generateId();
  const startedAt = new Date().toISOString();

  await db.runAsync(
    `INSERT INTO focus_sessions (id, task_id, planned_minutes, actual_minutes, started_at, ended_at, is_completed)
     VALUES (?, ?, ?, NULL, ?, NULL, 0)`,
    id,
    input.taskId ?? null,
    input.plannedMinutes,
    startedAt,
  );

  return {
    id,
    taskId: input.taskId ?? null,
    plannedMinutes: input.plannedMinutes,
    actualMinutes: null,
    startedAt,
    endedAt: null,
    isCompleted: false,
  };
}

export async function finish(
  db: SQLiteDatabase,
  id: string,
  actualMinutes: number,
  isCompleted: boolean,
): Promise<void> {
  await db.runAsync(
    'UPDATE focus_sessions SET ended_at = ?, actual_minutes = ?, is_completed = ? WHERE id = ?',
    new Date().toISOString(),
    actualMinutes,
    isCompleted ? 1 : 0,
    id,
  );
}

export async function listRecent(db: SQLiteDatabase, limit = 20): Promise<FocusSession[]> {
  const rows = await db.getAllAsync<FocusSessionRow>(
    'SELECT * FROM focus_sessions WHERE ended_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
    limit,
  );
  return rows.map(toSession);
}

export async function totalMinutesSince(db: SQLiteDatabase, sinceIso: string): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(actual_minutes) as total FROM focus_sessions WHERE started_at >= ? AND ended_at IS NOT NULL',
    sinceIso,
  );
  return row?.total ?? 0;
}
