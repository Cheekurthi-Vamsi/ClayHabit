import {
  buildContributionGrid,
  computeCompletionRate,
  computeStreakStats,
  countExpectedOccurrences,
} from '../streak-engine';

describe('computeStreakStats (daily)', () => {
  it('returns zeroes for no completions', () => {
    expect(computeStreakStats([], 'daily', '2026-09-21')).toEqual({
      current: 0,
      best: 0,
      totalCompletions: 0,
    });
  });

  it('counts a simple consecutive run as both current and best', () => {
    const dates = ['2026-09-18', '2026-09-19', '2026-09-20', '2026-09-21'];
    expect(computeStreakStats(dates, 'daily', '2026-09-21')).toEqual({
      current: 4,
      best: 4,
      totalCompletions: 4,
    });
  });

  it('keeps the streak alive if today is not completed yet but yesterday was', () => {
    const dates = ['2026-09-19', '2026-09-20'];
    const { current } = computeStreakStats(dates, 'daily', '2026-09-21');
    expect(current).toBe(2);
  });

  it('breaks the streak after a missed day', () => {
    const dates = ['2026-09-18', '2026-09-19', '2026-09-21'];
    const stats = computeStreakStats(dates, 'daily', '2026-09-21');
    expect(stats.current).toBe(1);
    expect(stats.best).toBe(2);
    expect(stats.totalCompletions).toBe(3);
  });

  it('reports zero current streak once two days have been missed', () => {
    const dates = ['2026-09-18'];
    expect(computeStreakStats(dates, 'daily', '2026-09-21').current).toBe(0);
  });
});

describe('computeStreakStats (weekdays)', () => {
  it('tolerates a weekend gap between Friday and Monday', () => {
    // 2026-09-18 Fri, 2026-09-21 Mon
    const dates = ['2026-09-16', '2026-09-17', '2026-09-18', '2026-09-21'];
    const stats = computeStreakStats(dates, 'weekdays', '2026-09-21');
    expect(stats.current).toBe(4);
  });

  it('breaks when a weekday itself is skipped', () => {
    const dates = ['2026-09-16', '2026-09-18'];
    const stats = computeStreakStats(dates, 'weekdays', '2026-09-18');
    expect(stats.current).toBe(1);
  });
});

describe('computeStreakStats (weekly)', () => {
  it('treats completions within seven days as consecutive', () => {
    const dates = ['2026-09-07', '2026-09-14', '2026-09-21'];
    const stats = computeStreakStats(dates, 'weekly', '2026-09-21');
    expect(stats.current).toBe(3);
    expect(stats.best).toBe(3);
  });
});

describe('countExpectedOccurrences', () => {
  it('counts every day for a daily rule', () => {
    expect(countExpectedOccurrences('2026-09-01', '2026-09-10', 'daily')).toBe(10);
  });

  it('counts one per week for a weekly rule', () => {
    expect(countExpectedOccurrences('2026-09-01', '2026-09-21', 'weekly')).toBe(3);
  });

  it('excludes weekends for a weekdays rule', () => {
    // 2026-09-14 (Mon) .. 2026-09-20 (Sun) = exactly one full week = 5 weekdays
    expect(countExpectedOccurrences('2026-09-14', '2026-09-20', 'weekdays')).toBe(5);
  });
});

describe('computeCompletionRate', () => {
  it('divides completions by expected occurrences, capped at 1', () => {
    expect(computeCompletionRate(3, 10)).toBeCloseTo(0.3);
    expect(computeCompletionRate(12, 10)).toBe(1);
    expect(computeCompletionRate(0, 0)).toBe(0);
  });
});

describe('buildContributionGrid', () => {
  it('builds the requested number of Monday-start weeks ending today', () => {
    const grid = buildContributionGrid(['2026-09-21'], 4, '2026-09-21');
    expect(grid).toHaveLength(4);
    grid.forEach((week) => expect(week).toHaveLength(7));

    const lastWeek = grid[grid.length - 1];
    const todayCell = lastWeek.find((day) => day.date === '2026-09-21');
    expect(todayCell?.isToday).toBe(true);
    expect(todayCell?.completed).toBe(true);
  });

  it('marks dates after today as future', () => {
    const grid = buildContributionGrid([], 1, '2026-09-16'); // Wednesday
    const flat = grid.flat();
    const future = flat.filter((day) => day.isFuture);
    expect(future.every((day) => day.date > '2026-09-16')).toBe(true);
    expect(future.length).toBeGreaterThan(0);
  });
});
