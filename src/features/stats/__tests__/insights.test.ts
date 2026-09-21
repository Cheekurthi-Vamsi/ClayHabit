import type { HabitWithLogs } from '@/domain/entities/habit';

import {
  bestWeekday,
  formatHour,
  habitsCompletionRate,
  peakHour,
  percentChange,
  sumRange,
} from '../insights';

describe('sumRange', () => {
  it('sums inclusive date ranges', () => {
    const counts = { '2026-09-20': 2, '2026-09-21': 3, '2026-09-23': 1 };
    expect(sumRange(counts, '2026-09-20', '2026-09-22')).toBe(5);
  });
});

describe('percentChange', () => {
  it('returns the relative change', () => {
    expect(percentChange(12, 10)).toBeCloseTo(20);
    expect(percentChange(5, 10)).toBeCloseTo(-50);
  });

  it('has no answer without a baseline', () => {
    expect(percentChange(5, 0)).toBeNull();
  });
});

describe('bestWeekday', () => {
  it('finds the weekday with the most activity', () => {
    // 2026-09-16 and 2026-09-09 are Wednesdays.
    const counts = { '2026-09-16': 4, '2026-09-09': 3, '2026-09-21': 2 };
    expect(bestWeekday(counts, '2026-09-21', 4)).toBe('Wednesday');
  });

  it('returns null with no activity', () => {
    expect(bestWeekday({}, '2026-09-21')).toBeNull();
  });
});

describe('peakHour', () => {
  it('returns the most common hour', () => {
    expect(peakHour([9, 14, 14, 21, 14, 9])).toBe(14);
  });

  it('breaks ties toward the earlier hour and handles no data', () => {
    expect(peakHour([18, 7])).toBe(7);
    expect(peakHour([])).toBeNull();
  });
});

describe('formatHour', () => {
  it('uses a 12-hour clock', () => {
    expect(formatHour(0)).toBe('12 AM');
    expect(formatHour(9)).toBe('9 AM');
    expect(formatHour(12)).toBe('12 PM');
    expect(formatHour(21)).toBe('9 PM');
  });
});

describe('habitsCompletionRate', () => {
  const base: HabitWithLogs = {
    id: 'h',
    name: 'Read',
    emoji: '📚',
    color: 'blue',
    targetPerDay: 1,
    daysOfWeek: '1111111',
    sortOrder: 0,
    isArchived: false,
    createdAt: '2026-09-01T00:00:00',
    updatedAt: '2026-09-01T00:00:00',
    logs: {},
  };

  it('pools scheduled days across habits', () => {
    const read = { ...base, logs: { '2026-09-20': 1, '2026-09-21': 1 } };
    const gym = { ...base, id: 'g', logs: { '2026-09-21': 1 } };
    // 2 habits × 2 days = 4 scheduled, 3 completed.
    expect(habitsCompletionRate([read, gym], '2026-09-20', '2026-09-21')).toBeCloseTo(0.75);
  });

  it('skips days before a habit existed', () => {
    const fresh = { ...base, createdAt: '2026-09-21T08:00:00', logs: { '2026-09-21': 1 } };
    expect(habitsCompletionRate([fresh], '2026-09-15', '2026-09-21')).toBe(1);
  });

  it('is null when nothing was scheduled', () => {
    expect(habitsCompletionRate([], '2026-09-15', '2026-09-21')).toBeNull();
  });
});
