import type { SQLiteDatabase } from 'expo-sqlite';

import { addDaysIso, localMidnightIso, toLocalIsoDate } from '@/utils/date';

/** Daily activity keyed by local date: tasks completed that day + habit check-ins logged for it. */
export type ActivityCounts = Record<string, number>;

export interface ActivityBreakdown {
  tasks: ActivityCounts;
  habits: ActivityCounts;
  total: ActivityCounts;
}

function add(counts: ActivityCounts, date: string, amount: number) {
  counts[date] = (counts[date] ?? 0) + amount;
}

/**
 * Task activity is bucketed by when the task was actually *completed* (in
 * local time), not by its due date — completing last week's overdue task
 * today is today's work.
 */
export async function countsByDate(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string,
): Promise<ActivityBreakdown> {
  const [taskRows, habitRows] = await Promise.all([
    db.getAllAsync<{ completed_at: string }>(
      'SELECT completed_at FROM task_completions WHERE completed_at >= ? AND completed_at < ?',
      localMidnightIso(startIso),
      localMidnightIso(addDaysIso(endIso, 1)),
    ),
    db.getAllAsync<{ date: string; total: number }>(
      `SELECT date, SUM(count) as total FROM habit_logs
       WHERE date BETWEEN ? AND ? AND count > 0
       GROUP BY date`,
      startIso,
      endIso,
    ),
  ]);

  const tasks: ActivityCounts = {};
  const habits: ActivityCounts = {};
  const total: ActivityCounts = {};

  for (const row of taskRows) {
    const date = toLocalIsoDate(new Date(row.completed_at));
    add(tasks, date, 1);
    add(total, date, 1);
  }
  for (const row of habitRows) {
    add(habits, row.date, row.total);
    add(total, row.date, row.total);
  }

  return { tasks, habits, total };
}

/** Every local date with any activity at all — the input for the app-wide streak. */
export async function activeDates(db: SQLiteDatabase): Promise<string[]> {
  const [taskRows, habitRows] = await Promise.all([
    db.getAllAsync<{ completed_at: string }>('SELECT completed_at FROM task_completions'),
    db.getAllAsync<{ date: string }>('SELECT DISTINCT date FROM habit_logs WHERE count > 0'),
  ]);

  const dates = new Set<string>(habitRows.map((row) => row.date));
  for (const row of taskRows) {
    dates.add(toLocalIsoDate(new Date(row.completed_at)));
  }
  return [...dates].sort();
}

/** Local hour (0–23) of each task completion since `startIso`. */
export async function completionHours(db: SQLiteDatabase, startIso: string): Promise<number[]> {
  const rows = await db.getAllAsync<{ completed_at: string }>(
    'SELECT completed_at FROM task_completions WHERE completed_at >= ?',
    localMidnightIso(startIso),
  );
  return rows.map((row) => new Date(row.completed_at).getHours());
}
