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
