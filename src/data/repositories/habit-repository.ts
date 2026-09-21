import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  Habit,
  HabitLogMap,
  HabitWithLogs,
  NewHabitInput,
  UpdateHabitInput,
} from '@/domain/entities/habit';
import { EVERY_DAY, isValidWeekdayMask } from '@/domain/services/habit-engine';
import { isHabitColor } from '@/theme/habit-palette';
import { generateId } from '@/utils/id';

interface HabitRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  target_per_day: number;
  days_of_week: string;
  sort_order: number;
  is_archived: number;
  created_at: string;
  updated_at: string;
}

interface LogRow {
  habit_id: string;
  date: string;
  count: number;
}

function toHabit(row: HabitRow): Habit {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: isHabitColor(row.color) ? row.color : 'purple',
    targetPerDay: Math.max(1, row.target_per_day),
    daysOfWeek: isValidWeekdayMask(row.days_of_week) ? row.days_of_week : EVERY_DAY,
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function clampTarget(target: number | undefined): number {
  return Math.min(99, Math.max(1, Math.round(target ?? 1)));
}

function validMask(mask: string | undefined): string {
  return mask && isValidWeekdayMask(mask) ? mask : EVERY_DAY;
}

export async function listActive(db: SQLiteDatabase): Promise<Habit[]> {
  const rows = await db.getAllAsync<HabitRow>(
    'SELECT * FROM habits WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC',
  );
  return rows.map(toHabit);
}

export async function getById(db: SQLiteDatabase, id: string): Promise<Habit | null> {
  const row = await db.getFirstAsync<HabitRow>('SELECT * FROM habits WHERE id = ?', id);
  return row ? toHabit(row) : null;
}

export async function getLogs(db: SQLiteDatabase, habitId: string): Promise<HabitLogMap> {
  const rows = await db.getAllAsync<LogRow>(
    'SELECT habit_id, date, count FROM habit_logs WHERE habit_id = ? AND count > 0',
    habitId,
  );
  return Object.fromEntries(rows.map((row) => [row.date, row.count]));
}

export async function getWithLogs(db: SQLiteDatabase, id: string): Promise<HabitWithLogs | null> {
  const habit = await getById(db, id);
  if (!habit) return null;
  return { ...habit, logs: await getLogs(db, id) };
}

/** Every active habit with its full check-in history, in two queries rather than N+1. */
export async function listActiveWithLogs(db: SQLiteDatabase): Promise<HabitWithLogs[]> {
  const habits = await listActive(db);
  if (habits.length === 0) return [];

  const rows = await db.getAllAsync<LogRow>(
    `SELECT habit_logs.habit_id, habit_logs.date, habit_logs.count
     FROM habit_logs
     INNER JOIN habits ON habits.id = habit_logs.habit_id
     WHERE habits.is_archived = 0 AND habit_logs.count > 0`,
  );

  const byHabit = new Map<string, HabitLogMap>();
  for (const row of rows) {
    const logs = byHabit.get(row.habit_id) ?? {};
    logs[row.date] = row.count;
    byHabit.set(row.habit_id, logs);
  }

  return habits.map((habit) => ({ ...habit, logs: byHabit.get(habit.id) ?? {} }));
}

export async function create(db: SQLiteDatabase, input: NewHabitInput): Promise<Habit> {
  const id = generateId();
  const now = new Date().toISOString();
  const orderRow = await db.getFirstAsync<{ next: number | null }>(
    'SELECT MAX(sort_order) + 1 as next FROM habits',
  );
  const sortOrder = orderRow?.next ?? 0;
  const targetPerDay = clampTarget(input.targetPerDay);
  const daysOfWeek = validMask(input.daysOfWeek);

  await db.runAsync(
    `INSERT INTO habits (id, name, emoji, color, target_per_day, days_of_week, sort_order, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    input.name.trim(),
    input.emoji,
    input.color,
    targetPerDay,
    daysOfWeek,
    sortOrder,
    now,
    now,
  );

  return {
    id,
    name: input.name.trim(),
    emoji: input.emoji,
    color: input.color,
    targetPerDay,
    daysOfWeek,
    sortOrder,
    isArchived: false,
    createdAt: now,
    updatedAt: now,
  };
}

export async function update(db: SQLiteDatabase, id: string, input: UpdateHabitInput): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) return;

  await db.runAsync(
    `UPDATE habits SET name = ?, emoji = ?, color = ?, target_per_day = ?, days_of_week = ?, updated_at = ?
     WHERE id = ?`,
    input.name?.trim() || existing.name,
    input.emoji ?? existing.emoji,
    input.color ?? existing.color,
    input.targetPerDay !== undefined ? clampTarget(input.targetPerDay) : existing.targetPerDay,
    input.daysOfWeek !== undefined ? validMask(input.daysOfWeek) : existing.daysOfWeek,
    new Date().toISOString(),
    id,
  );
}

export async function setArchived(db: SQLiteDatabase, id: string, isArchived: boolean): Promise<void> {
  await db.runAsync('UPDATE habits SET is_archived = ? WHERE id = ?', isArchived ? 1 : 0, id);
}

export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM habits WHERE id = ?', id);
}

export async function getCount(db: SQLiteDatabase, habitId: string, date: string): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT count FROM habit_logs WHERE habit_id = ? AND date = ?',
    habitId,
    date,
  );
  return row?.count ?? 0;
}

/** Sets the check-in count for a day; zero removes the row so it can't inflate streak/history queries. */
export async function setCount(
  db: SQLiteDatabase,
  habitId: string,
  date: string,
  count: number,
): Promise<number> {
  const next = Math.max(0, Math.min(999, Math.round(count)));
  if (next === 0) {
    await db.runAsync('DELETE FROM habit_logs WHERE habit_id = ? AND date = ?', habitId, date);
    return 0;
  }

  await db.runAsync(
    `INSERT INTO habit_logs (habit_id, date, count, updated_at) VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, date) DO UPDATE SET count = excluded.count, updated_at = excluded.updated_at`,
    habitId,
    date,
    next,
    new Date().toISOString(),
  );
  return next;
}

export async function adjustCount(
  db: SQLiteDatabase,
  habitId: string,
  date: string,
  delta: number,
): Promise<number> {
  const current = await getCount(db, habitId, date);
  return setCount(db, habitId, date, current + delta);
}
