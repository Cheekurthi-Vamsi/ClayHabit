import type { RepeatRule } from '@/domain/entities/task';
import { toLocalIsoDate } from '@/utils/date';

export interface StreakStats {
  current: number;
  best: number;
  totalCompletions: number;
}

export interface ContributionDay {
  date: string;
  completed: boolean;
  isToday: boolean;
  isFuture: boolean;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`).getTime();
  const b = new Date(`${bIso}T00:00:00`).getTime();
  return Math.round((b - a) / 86400000);
}

/**
 * Whether `curr` directly follows `prev` for the given cadence, with no
 * expected occurrence skipped in between. Daily requires an exact one-day
 * gap; weekly tolerates up to a week (not anchored to a specific weekday);
 * weekdays tolerates a weekend gap but not a skipped weekday.
 */
function isConsecutive(prevIso: string, currIso: string, rule: RepeatRule): boolean {
  const gap = daysBetween(prevIso, currIso);
  if (gap <= 0) return false;

  if (rule === 'daily') return gap === 1;
  if (rule === 'weekly') return gap <= 7;

  const cursor = new Date(`${prevIso}T00:00:00`);
  for (let i = 1; i < gap; i++) {
    cursor.setDate(cursor.getDate() + 1);
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) return false; // a weekday in between was skipped
  }
  return true;
}

/**
 * Consecutive-completion streak for a set of (deduplicated) completion
 * dates. `rule` controls what counts as "no occurrence missed" between two
 * completions — e.g. a weekday task tolerates a weekend gap but not a
 * skipped weekday. Used both for a single recurring task series and, with
 * rule='daily', for the app-wide "did you complete something today" streak.
 */
export function computeStreakStats(
  dates: string[],
  rule: RepeatRule,
  todayIso: string,
): StreakStats {
  const unique = Array.from(new Set(dates)).sort();
  if (unique.length === 0) {
    return { current: 0, best: 0, totalCompletions: 0 };
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < unique.length; i++) {
    run = isConsecutive(unique[i - 1], unique[i], rule) ? run + 1 : 1;
    best = Math.max(best, run);
  }

  const mostRecent = unique[unique.length - 1];
  const alive = mostRecent === todayIso || isConsecutive(mostRecent, todayIso, rule);

  let current = 0;
  if (alive) {
    current = 1;
    for (let i = unique.length - 2; i >= 0; i--) {
      if (isConsecutive(unique[i], unique[i + 1], rule)) {
        current += 1;
      } else {
        break;
      }
    }
  }

  return { current, best, totalCompletions: unique.length };
}

export function countExpectedOccurrences(
  startIso: string,
  endIso: string,
  rule: RepeatRule,
): number {
  const totalDays = daysBetween(startIso, endIso) + 1;
  if (totalDays <= 0) return 0;

  if (rule === 'daily') return totalDays;
  if (rule === 'weekly') return Math.floor((totalDays - 1) / 7) + 1;

  let count = 0;
  const cursor = new Date(`${startIso}T00:00:00`);
  for (let i = 0; i < totalDays; i++) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor.setDate(cursor.getDate() + 1);
  }
  return count;
}

export function computeCompletionRate(totalCompletions: number, expectedOccurrences: number): number {
  if (expectedOccurrences <= 0) return 0;
  return Math.min(1, totalCompletions / expectedOccurrences);
}

/**
 * Builds a Monday-start contribution grid ending on `todayIso`, `weeks` wide.
 * Returned as columns (weeks), each a 7-item array (Mon..Sun), matching how
 * a GitHub-style grid is typically rendered column-by-column.
 */
export function buildContributionGrid(
  dates: string[],
  weeks: number,
  todayIso: string,
): ContributionDay[][] {
  const completed = new Set(dates);
  const today = new Date(`${todayIso}T00:00:00`);

  // Find the Monday on/before today, then step back to cover the full grid.
  const mondayOffset = (today.getDay() + 6) % 7;
  const gridEnd = new Date(today);
  gridEnd.setDate(gridEnd.getDate() - mondayOffset + 6);

  const totalDays = weeks * 7;
  const gridStart = new Date(gridEnd);
  gridStart.setDate(gridStart.getDate() - totalDays + 1);

  const columns: ContributionDay[][] = [];
  const cursor = new Date(gridStart);

  for (let w = 0; w < weeks; w++) {
    const column: ContributionDay[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = toLocalIsoDate(cursor);
      column.push({
        date: iso,
        completed: completed.has(iso),
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    columns.push(column);
  }

  return columns;
}
