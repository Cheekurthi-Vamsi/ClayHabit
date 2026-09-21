import type { HabitWithLogs } from '@/domain/entities/habit';
import type { Task } from '@/domain/entities/task';
import { isCompletedOn, isScheduledOn } from '@/domain/services/habit-engine';
import { toLocalIsoDate } from '@/utils/date';

export interface DayProgress {
  done: number;
  total: number;
}

/** Tasks due that day plus habits scheduled that day (and already existing by then). */
export function progressFor(dateIso: string, tasks: Task[], habits: HabitWithLogs[]): DayProgress {
  const liveHabits = habits.filter(
    (habit) =>
      isScheduledOn(habit.daysOfWeek, dateIso) && toLocalIsoDate(new Date(habit.createdAt)) <= dateIso,
  );
  return {
    done:
      tasks.filter((task) => task.isCompleted).length +
      liveHabits.filter((habit) => isCompletedOn(habit.logs, habit.targetPerDay, dateIso)).length,
    total: tasks.length + liveHabits.length,
  };
}

/**
 * The next incomplete task today: the soonest one still ahead of now, or
 * else the earliest timed one that's already overdue.
 */
export function pickNextUp(tasks: Task[], nowHHmm: string): Task | null {
  const timed = tasks
    .filter((task) => !task.isCompleted && task.dueTime)
    .sort((a, b) => (a.dueTime! < b.dueTime! ? -1 : 1));
  return timed.find((task) => task.dueTime! >= nowHHmm) ?? timed[0] ?? null;
}

export function currentTimeHHmm(date: Date = new Date()): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
