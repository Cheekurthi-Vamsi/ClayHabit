import {
  addMonths,
  addMonthsToDate,
  datesInMonth,
  daysBetween,
  daysInMonth,
  formatDayLabel,
  formatMonthLabel,
  isMonthKey,
  monthEnd,
  monthKeyOf,
  samePointLastMonth,
  wholeMonthsBetween,
} from '../month';

describe('month keys', () => {
  it('derives and validates month keys', () => {
    expect(monthKeyOf('2026-09-21')).toBe('2026-09');
    expect(isMonthKey('2026-09')).toBe(true);
    expect(isMonthKey('2026-13')).toBe(false);
    expect(isMonthKey('2026-9')).toBe(false);
  });

  it('knows month lengths, including leap years', () => {
    expect(daysInMonth('2026-09')).toBe(30);
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2028-02')).toBe(29);
    expect(daysInMonth('2100-02')).toBe(28);
    expect(daysInMonth('2000-02')).toBe(29);
    expect(monthEnd('2028-02')).toBe('2028-02-29');
  });

  it('adds months across year boundaries in both directions', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
    expect(addMonths('2026-09', 18)).toBe('2028-03');
  });
});

describe('datesInMonth', () => {
  it('lists every day, or stops at a given date', () => {
    expect(datesInMonth('2028-02')).toHaveLength(29);
    expect(datesInMonth('2026-09', '2026-09-03')).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });

  it('ignores a stop date past the end of the month', () => {
    expect(datesInMonth('2026-09', '2026-10-15')).toHaveLength(30);
  });
});

describe('labels', () => {
  it('formats months and days', () => {
    expect(formatMonthLabel('2026-09')).toBe('September 2026');
    expect(formatMonthLabel('2026-09', true)).toBe('Sep');
    expect(formatDayLabel('2026-09-05')).toBe('Sep 5');
  });
});

describe('samePointLastMonth', () => {
  it('compares against the same span of last month', () => {
    expect(samePointLastMonth('2026-09-21')).toEqual({ start: '2026-08-01', end: '2026-08-21' });
  });

  it('clips at the end of a shorter month', () => {
    expect(samePointLastMonth('2026-03-31')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(samePointLastMonth('2028-03-31')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
  });

  it('crosses the year boundary', () => {
    expect(samePointLastMonth('2027-01-10')).toEqual({ start: '2026-12-01', end: '2026-12-10' });
  });
});

describe('day and month distances', () => {
  it('counts days, across leap days and DST changes', () => {
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2);
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31);
    expect(daysBetween('2026-11-01', '2026-10-01')).toBe(-31);
  });

  it('counts whole calendar months', () => {
    expect(wholeMonthsBetween('2026-09-21', '2027-03-21')).toBe(6);
    expect(wholeMonthsBetween('2026-09-21', '2027-03-20')).toBe(5);
    expect(wholeMonthsBetween('2026-09-21', '2026-09-30')).toBe(0);
    expect(wholeMonthsBetween('2026-09-21', '2026-01-01')).toBe(0);
  });

  it('adds months to a date, clamping to shorter months', () => {
    expect(addMonthsToDate('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsToDate('2028-01-31', 1)).toBe('2028-02-29');
    expect(addMonthsToDate('2026-09-21', 6)).toBe('2027-03-21');
  });
});
