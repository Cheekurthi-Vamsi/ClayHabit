/**
 * Formats a Date as a local YYYY-MM-DD calendar date. Deliberately avoids
 * `toISOString()`, which converts to UTC first and silently shifts the
 * calendar date by one day for anyone in a positive UTC-offset timezone
 * (most of Asia-Pacific) around local midnight.
 */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayIso(): string {
  return toLocalIsoDate(new Date());
}

export function addDaysIso(iso: string, delta: number): string {
  const date = new Date(`${iso}T00:00:00`);
  date.setDate(date.getDate() + delta);
  return toLocalIsoDate(date);
}

/** Monday of the week containing `iso`. */
export function startOfWeekIso(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return addDaysIso(iso, -((date.getDay() + 6) % 7));
}

/** Local-midnight instant for a YYYY-MM-DD date, as a UTC ISO timestamp for SQL range queries. */
export function localMidnightIso(iso: string): string {
  return new Date(`${iso}T00:00:00`).toISOString();
}

export function formatLongDate(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
}

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const minutes = Math.round((now - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Still up';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

export function formatTime12h(time: string | null): string | null {
  if (!time) return null;
  const [hourStr, minuteStr] = time.split(':');
  const hour = Number(hourStr);
  const minute = Number(minuteStr);
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
}

/** Combines a local YYYY-MM-DD date with an HH:mm time into a local Date. */
export function combineDateAndTime(dateIso: string, time: string): Date {
  const [hour, minute] = time.split(':').map(Number);
  const date = new Date(`${dateIso}T00:00:00`);
  date.setHours(hour, minute, 0, 0);
  return date;
}

/**
 * A fixed 6-week (42-day), Monday-start grid of local dates covering the
 * given month, padded with adjacent-month days so every month renders the
 * same grid height.
 */
export function getMonthGridDates(year: number, monthIndex: number): string[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const cursor = new Date(firstOfMonth);
  cursor.setDate(cursor.getDate() - startOffset);

  const dates: string[] = [];
  for (let i = 0; i < 42; i++) {
    dates.push(toLocalIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
