import type { SQLiteDatabase } from 'expo-sqlite';

import type { CalendarEvent, NewCalendarEventInput } from '@/domain/entities/calendar-event';
import { generateId } from '@/utils/id';

interface CalendarEventRow {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
  created_at: string;
}

function toEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    color: row.color,
    createdAt: row.created_at,
  };
}

export async function listForDateRange(
  db: SQLiteDatabase,
  startIso: string,
  endIso: string,
): Promise<CalendarEvent[]> {
  const rows = await db.getAllAsync<CalendarEventRow>(
    'SELECT * FROM calendar_events WHERE date BETWEEN ? AND ? ORDER BY date ASC, start_time ASC',
    startIso,
    endIso,
  );
  return rows.map(toEvent);
}

export async function create(db: SQLiteDatabase, input: NewCalendarEventInput): Promise<CalendarEvent> {
  const id = generateId();
  const now = new Date().toISOString();

  await db.runAsync(
    'INSERT INTO calendar_events (id, title, date, start_time, end_time, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    input.title.trim(),
    input.date,
    input.startTime ?? null,
    input.endTime ?? null,
    input.color,
    now,
  );

  return {
    id,
    title: input.title.trim(),
    date: input.date,
    startTime: input.startTime ?? null,
    endTime: input.endTime ?? null,
    color: input.color,
    createdAt: now,
  };
}

export async function remove(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM calendar_events WHERE id = ?', id);
}
