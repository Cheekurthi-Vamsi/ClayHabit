import type { HabitWithLogs } from '@/domain/entities/habit';
import type { Task } from '@/domain/entities/task';

import { currentTimeHHmm, pickNextUp, progressFor } from '../progress';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? Math.random().toString(36),
    title: 'Task',
    description: null,
    dueDate: '2026-09-21',
    dueTime: null,
    priority: 'medium',
    projectId: null,
    goalId: null,
    repeatRule: null,
    estimatedMinutes: null,
    seriesId: 'series',
    reminderEnabled: false,
    reminderTime: null,
    notificationId: null,
    isArchived: false,
    isCompleted: false,
    completedAt: null,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

function habit(overrides: Partial<HabitWithLogs>): HabitWithLogs {
  return {
    id: 'h',
    name: 'Habit',
    emoji: '✨',
    icon: null,
    color: 'purple',
    targetPerDay: 1,
    daysOfWeek: '1111111',
    sortOrder: 0,
    isArchived: false,
    createdAt: '2026-09-01T00:00:00',
    updatedAt: '2026-09-01T00:00:00',
    logs: {},
    ...overrides,
  };
}

const MONDAY = '2026-09-21';

describe('progressFor', () => {
  it('combines tasks and scheduled habits', () => {
    const progress = progressFor(
      MONDAY,
      [task({ isCompleted: true }), task({})],
      [habit({ logs: { [MONDAY]: 1 } }), habit({ id: 'h2' })],
    );
    expect(progress).toEqual({ done: 2, total: 4 });
  });

  it('ignores habits not scheduled that day', () => {
    const weekendOnly = habit({ daysOfWeek: '0000011' });
    expect(progressFor(MONDAY, [], [weekendOnly])).toEqual({ done: 0, total: 0 });
  });

  it('ignores habits created after that day', () => {
    const newer = habit({ createdAt: '2026-09-22T09:00:00' });
    expect(progressFor(MONDAY, [], [newer]).total).toBe(0);
  });

  it('only counts a habit as done once its daily target is met', () => {
    const water = habit({ targetPerDay: 8, logs: { [MONDAY]: 5 } });
    expect(progressFor(MONDAY, [], [water])).toEqual({ done: 0, total: 1 });
  });
});

describe('pickNextUp', () => {
  it('picks the soonest incomplete task still ahead', () => {
    const tasks = [
      task({ id: 'a', dueTime: '09:00' }),
      task({ id: 'b', dueTime: '16:30' }),
      task({ id: 'c', dueTime: '14:00' }),
      task({ id: 'd', dueTime: '13:00', isCompleted: true }),
    ];
    expect(pickNextUp(tasks, '12:00')?.id).toBe('c');
  });

  it('falls back to the earliest overdue task once everything is past', () => {
    const tasks = [task({ id: 'a', dueTime: '09:00' }), task({ id: 'b', dueTime: '10:00' })];
    expect(pickNextUp(tasks, '18:00')?.id).toBe('a');
  });

  it('returns null when nothing today has a time', () => {
    expect(pickNextUp([task({})], '12:00')).toBeNull();
  });
});

describe('currentTimeHHmm', () => {
  it('zero-pads hours and minutes', () => {
    expect(currentTimeHHmm(new Date(2026, 8, 21, 7, 5))).toBe('07:05');
  });
});
