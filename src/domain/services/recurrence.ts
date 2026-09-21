import type { RepeatRule } from '@/domain/entities/task';
import { toLocalIsoDate } from '@/utils/date';

export function nextOccurrence(dueDateIso: string, rule: RepeatRule): string {
  const date = new Date(`${dueDateIso}T00:00:00`);

  if (rule === 'daily') {
    date.setDate(date.getDate() + 1);
    return toLocalIsoDate(date);
  }

  if (rule === 'weekly') {
    date.setDate(date.getDate() + 7);
    return toLocalIsoDate(date);
  }

  // weekdays: advance at least one day, then skip Saturday/Sunday
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6);

  return toLocalIsoDate(date);
}
