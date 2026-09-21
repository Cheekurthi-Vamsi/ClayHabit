import type { HabitWithLogs } from '@/domain/entities/habit';

import {
  average,
  bestWeekday,
  dailySeries,
  dayParts,
  formatHour,
  formatMinutes,
  habitsCompletionRate,
  hourBuckets,
  indexOfMax,
  peakHour,
  percentChange,
  sumRange,
  weekdayAverages,
} from '../insights';

describe('dailySeries', () => {
  it('lists each day ending on the given date, oldest first, with zeros filled in', () => {
    const counts = { '2026-09-19': 2, '2026-09-21': 5 };
    expect(dailySeries(counts, '2026-09-21', 4)).toEqual({
      dates: ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'],
      values: [0, 2, 0, 5],
    });
  });

  it('crosses month boundaries', () => {
    expect(dailySeries({}, '2026-10-01', 3).dates).toEqual(['2026-09-29', '2026-09-30', '2026-10-01']);
  });
});

describe('weekdayAverages', () => {
  it('averages each weekday over whole weeks, Monday first', () => {
    // 2026-09-21 is a Monday; over two weeks there are two Mondays (21st, 14th).
    const counts = { '2026-09-21': 4, '2026-09-14': 2, '2026-09-16': 6 };
    const averages = weekdayAverages(counts, '2026-09-21', 2);
    expect(averages).toHaveLength(7);
    expect(averages[0]).toBe(3);
    expect(averages[2]).toBe(3); // one Wednesday with 6, over two weeks
    expect(averages[4]).toBe(0);
  });
});

describe('hourBuckets and dayParts', () => {
  it('counts completions per hour', () => {
    const buckets = hourBuckets([9, 9, 23, 0]);
    expect(buckets).toHaveLength(24);
    expect(buckets[9]).toBe(2);
    expect(buckets[23]).toBe(1);
    expect(buckets[0]).toBe(1);
  });

  it('splits the day into morning, afternoon, evening and night', () => {
    const parts = dayParts([5, 11, 12, 16, 17, 20, 21, 4]);
    expect(parts.map((part) => [part.key, part.count])).toEqual([
      ['morning', 2],
      ['afternoon', 2],
      ['evening', 2],
      ['night', 2],
    ]);
  });
});

describe('average, indexOfMax and formatMinutes', () => {
  it('averages, and treats an empty list as zero', () => {
    expect(average([2, 4, 6])).toBe(4);
    expect(average([])).toBe(0);
  });

  it('finds the first peak, or null when everything is zero', () => {
    expect(indexOfMax([1, 5, 5, 2])).toBe(1);
    expect(indexOfMax([0, 0])).toBeNull();
  });

  it('formats minutes as hours and minutes', () => {
    expect(formatMinutes(40)).toBe('40m');
    expect(formatMinutes(60)).toBe('1h');
    expect(formatMinutes(95)).toBe('1h 35m');
  });
});

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
    icon: null,
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
