import {
  canShift,
  clampPeriod,
  comparisonRange,
  currentPeriod,
  dayCount,
  monthsBetween,
  monthsOfYear,
  periodLabel,
  periodRange,
  shiftPeriod,
} from '../period';

const TODAY = '2026-09-22';

describe('periodRange', () => {
  it('clips the current month and year at today', () => {
    expect(periodRange({ scope: 'month', month: '2026-09' }, TODAY, null)).toEqual({
      from: '2026-09-01',
      to: TODAY,
      inProgress: true,
    });
    expect(periodRange({ scope: 'year', year: 2026 }, TODAY, null)).toEqual({
      from: '2026-01-01',
      to: TODAY,
      inProgress: true,
    });
  });

  it('covers past periods in full', () => {
    expect(periodRange({ scope: 'month', month: '2024-02' }, TODAY, null)).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
      inProgress: false,
    });
    expect(periodRange({ scope: 'year', year: 2025 }, TODAY, null)).toEqual({
      from: '2025-01-01',
      to: '2025-12-31',
      inProgress: false,
    });
  });

  it('starts all time at the first record, or today with none', () => {
    expect(periodRange({ scope: 'all' }, TODAY, '2023-04-10')).toEqual({ from: '2023-04-10', to: TODAY, inProgress: true });
    expect(periodRange({ scope: 'all' }, TODAY, null)).toEqual({ from: TODAY, to: TODAY, inProgress: true });
  });
});

describe('comparisonRange', () => {
  it('compares an unfinished month with the same days of the last one', () => {
    expect(comparisonRange({ scope: 'month', month: '2026-09' }, TODAY)).toEqual({
      from: '2026-08-01',
      to: '2026-08-22',
      label: 'Aug 1–22',
    });
  });

  it('clamps to the end of a shorter previous month', () => {
    expect(comparisonRange({ scope: 'month', month: '2026-03' }, '2026-03-31')).toMatchObject({
      from: '2026-02-01',
      to: '2026-02-28',
    });
  });

  it('compares a finished month or year with the whole one before', () => {
    expect(comparisonRange({ scope: 'month', month: '2026-01' }, TODAY)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
      label: 'December 2025',
    });
    expect(comparisonRange({ scope: 'year', year: 2025 }, TODAY)).toEqual({
      from: '2024-01-01',
      to: '2024-12-31',
      label: '2024',
    });
  });

  it('compares this year so far with the same days last year, leap day included', () => {
    expect(comparisonRange({ scope: 'year', year: 2026 }, TODAY)).toEqual({
      from: '2025-01-01',
      to: '2025-09-22',
      label: 'Jan 1 – Sep 22, 2025',
    });
    expect(comparisonRange({ scope: 'year', year: 2028 }, '2028-02-29')).toMatchObject({ to: '2027-02-28' });
  });

  it('has nothing to compare all time with', () => {
    expect(comparisonRange({ scope: 'all' }, TODAY)).toBeNull();
  });
});

describe('stepping between periods', () => {
  const bounds = { firstMonth: '2024-11', lastMonth: '2026-09' };

  it('moves by month and year across year boundaries', () => {
    expect(shiftPeriod({ scope: 'month', month: '2026-01' }, -1)).toEqual({ scope: 'month', month: '2025-12' });
    expect(shiftPeriod({ scope: 'year', year: 2026 }, -1)).toEqual({ scope: 'year', year: 2025 });
    expect(shiftPeriod({ scope: 'all' }, 1)).toEqual({ scope: 'all' });
  });

  it('stays within the months that have records', () => {
    expect(canShift({ scope: 'month', month: '2024-12' }, -1, bounds)).toBe(true);
    expect(canShift({ scope: 'month', month: '2024-11' }, -1, bounds)).toBe(false);
    expect(canShift({ scope: 'month', month: '2026-09' }, 1, bounds)).toBe(false);
    expect(canShift({ scope: 'year', year: 2025 }, -1, bounds)).toBe(true);
    expect(canShift({ scope: 'year', year: 2024 }, -1, bounds)).toBe(false);
    expect(canShift({ scope: 'year', year: 2026 }, 1, bounds)).toBe(false);
    expect(canShift({ scope: 'all' }, -1, bounds)).toBe(false);
  });

  it('pulls an out-of-range period back inside', () => {
    expect(clampPeriod({ scope: 'month', month: '2020-01' }, bounds)).toEqual({ scope: 'month', month: '2024-11' });
    expect(clampPeriod({ scope: 'year', year: 2030 }, bounds)).toEqual({ scope: 'year', year: 2026 });
    const inside = { scope: 'month', month: '2025-05' } as const;
    expect(clampPeriod(inside, bounds)).toBe(inside);
  });
});

describe('period helpers', () => {
  it('names periods', () => {
    expect(periodLabel({ scope: 'month', month: '2026-09' })).toBe('September 2026');
    expect(periodLabel({ scope: 'year', year: 2025 })).toBe('2025');
    expect(periodLabel({ scope: 'all' })).toBe('All time');
  });

  it('finds the current period', () => {
    expect(currentPeriod('month', TODAY)).toEqual({ scope: 'month', month: '2026-09' });
    expect(currentPeriod('year', TODAY)).toEqual({ scope: 'year', year: 2026 });
  });

  it('lists months and counts days', () => {
    expect(monthsOfYear(2026)).toHaveLength(12);
    expect(monthsOfYear(2026)[11]).toBe('2026-12');
    expect(monthsBetween('2025-11', '2026-02')).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(dayCount({ from: '2024-01-01', to: '2024-12-31' })).toBe(366);
    expect(dayCount({ from: TODAY, to: TODAY })).toBe(1);
  });
});
