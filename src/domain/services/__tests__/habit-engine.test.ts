import {
  completionRate,
  computeHabitStats,
  describeSchedule,
  habitLevel,
  isScheduledOn,
  isValidWeekdayMask,
  nextTapCount,
  weekdayIndex,
} from '../habit-engine';

// 2026-09-21 is a Monday. Fixture week: Mon 21 … Sun 27.
const MON = '2026-09-21';

describe('weekday helpers', () => {
  it('indexes Monday as 0 and Sunday as 6', () => {
    expect(weekdayIndex('2026-09-21')).toBe(0);
    expect(weekdayIndex('2026-09-27')).toBe(6);
  });

  it('reads the Monday-first weekday mask', () => {
    expect(isScheduledOn('1111100', '2026-09-25')).toBe(true); // Fri
    expect(isScheduledOn('1111100', '2026-09-26')).toBe(false); // Sat
  });

  it('describes common schedules in words', () => {
    expect(describeSchedule('1111111')).toBe('Every day');
    expect(describeSchedule('1111100')).toBe('Weekdays');
    expect(describeSchedule('0000011')).toBe('Weekends');
    expect(describeSchedule('1010100')).toBe('Mon · Wed · Fri');
  });

  it('rejects masks that are malformed or schedule nothing', () => {
    expect(isValidWeekdayMask('1111111')).toBe(true);
    expect(isValidWeekdayMask('0000000')).toBe(false);
    expect(isValidWeekdayMask('11111')).toBe(false);
  });
});

describe('computeHabitStats', () => {
  it('returns zeroes with no check-ins', () => {
    expect(computeHabitStats({}, 1, '1111111', MON)).toEqual({
      currentStreak: 0,
      bestStreak: 0,
      totalCheckIns: 0,
      activeDays: 0,
      completedDays: 0,
    });
  });

  it('counts consecutive completed days ending today', () => {
    const logs = { '2026-09-19': 1, '2026-09-20': 1, '2026-09-21': 1 };
    const stats = computeHabitStats(logs, 1, '1111111', MON);
    expect(stats.currentStreak).toBe(3);
    expect(stats.bestStreak).toBe(3);
  });

  it('does not break the streak just because today is not done yet', () => {
    const logs = { '2026-09-19': 1, '2026-09-20': 1 };
    expect(computeHabitStats(logs, 1, '1111111', MON).currentStreak).toBe(2);
  });

  it('breaks on a missed scheduled day', () => {
    const logs = { '2026-09-17': 1, '2026-09-18': 1, '2026-09-20': 1 };
    const stats = computeHabitStats(logs, 1, '1111111', MON);
    expect(stats.currentStreak).toBe(1);
    expect(stats.bestStreak).toBe(2);
  });

  it('skips unscheduled days instead of breaking on them', () => {
    // Weekdays only: Fri 18 → (Sat, Sun skipped) → Mon 21.
    const logs = { '2026-09-17': 1, '2026-09-18': 1, '2026-09-21': 1 };
    expect(computeHabitStats(logs, 1, '1111100', MON).currentStreak).toBe(3);
  });

  it('only counts a day toward the streak once the daily target is met', () => {
    const logs = { '2026-09-20': 8, '2026-09-21': 3 };
    const stats = computeHabitStats(logs, 8, '1111111', MON);
    expect(stats.currentStreak).toBe(1); // today partial = pending, yesterday complete
    expect(stats.completedDays).toBe(1);
    expect(stats.activeDays).toBe(2);
    expect(stats.totalCheckIns).toBe(11);
  });

  it('ignores future-dated logs', () => {
    const logs = { '2026-09-21': 1, '2026-09-22': 1 };
    expect(computeHabitStats(logs, 1, '1111111', MON).totalCheckIns).toBe(1);
  });
});

describe('completionRate', () => {
  it('divides completed scheduled days by scheduled days', () => {
    const logs = { '2026-09-21': 1, '2026-09-22': 1 };
    // Mon–Fri scheduled = 5 days, 2 completed.
    expect(completionRate(logs, 1, '1111100', MON, '2026-09-27')).toBeCloseTo(0.4);
  });

  it('is zero for an empty or inverted range', () => {
    expect(completionRate({}, 1, '1111111', '2026-09-22', MON)).toBe(0);
  });
});

describe('nextTapCount', () => {
  it('toggles a once-a-day habit', () => {
    expect(nextTapCount(0, 1)).toBe(1);
    expect(nextTapCount(1, 1)).toBe(0);
  });

  it('counts up to the target, then clears', () => {
    expect(nextTapCount(0, 3)).toBe(1);
    expect(nextTapCount(2, 3)).toBe(3);
    expect(nextTapCount(3, 3)).toBe(0);
  });
});

describe('habitLevel', () => {
  it('scales intensity against the daily target', () => {
    expect(habitLevel(0, 8)).toBe(0);
    expect(habitLevel(1, 8)).toBe(1);
    expect(habitLevel(4, 8)).toBe(2);
    expect(habitLevel(6, 8)).toBe(3);
    expect(habitLevel(8, 8)).toBe(4);
    expect(habitLevel(12, 8)).toBe(4);
  });

  it('treats a single check-in on a once-a-day habit as full intensity', () => {
    expect(habitLevel(1, 1)).toBe(4);
  });
});
