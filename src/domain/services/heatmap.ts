import { toLocalIsoDate } from '@/utils/date';

import type { HeatmapLevel } from './habit-engine';

export interface CalendarCell {
  date: string;
  isToday: boolean;
  isFuture: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * `weeks` Monday-start columns (7 cells each, Mon→Sun) ending with the week
 * that contains `todayIso`. Days after today are flagged `isFuture` so the
 * current week can render partially, like GitHub's grid.
 */
export function buildCalendarColumns(weeks: number, todayIso: string): CalendarCell[][] {
  const today = new Date(`${todayIso}T00:00:00`);
  const mondayOffset = (today.getDay() + 6) % 7;
  const cursor = new Date(today);
  cursor.setDate(cursor.getDate() - mondayOffset - (weeks - 1) * 7);

  const columns: CalendarCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: CalendarCell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toLocalIsoDate(cursor);
      column.push({ date: iso, isToday: iso === todayIso, isFuture: iso > todayIso });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }
  return columns;
}

export interface MonthLabel {
  index: number;
  label: string;
}

/** Month names positioned at the first column of each month, skipping any that would overlap. */
export function monthLabelsFor(columns: CalendarCell[][], minGap = 3): MonthLabel[] {
  const labels: MonthLabel[] = [];
  let lastMonth = -1;

  columns.forEach((week, index) => {
    const month = new Date(`${week[0].date}T00:00:00`).getMonth();
    if (month !== lastMonth) {
      labels.push({ index, label: MONTHS[month] });
      lastMonth = month;
    }
  });

  if (labels.length > 1 && labels[1].index - labels[0].index < minGap) {
    labels.shift();
  }
  return labels;
}

/**
 * GitHub-style intensity for aggregate activity where there's no fixed
 * daily target: quartiles of the busiest day in the visible range.
 */
export function relativeLevel(count: number, max: number): HeatmapLevel {
  if (count <= 0 || max <= 0) return 0;
  return Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as HeatmapLevel;
}

export function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
