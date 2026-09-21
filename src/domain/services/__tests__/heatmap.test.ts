import { buildCalendarColumns, formatShortDate, monthLabelsFor, relativeLevel } from '../heatmap';

describe('buildCalendarColumns', () => {
  it('builds Monday-start weeks ending with the week containing today', () => {
    // 2026-09-23 is a Wednesday.
    const columns = buildCalendarColumns(2, '2026-09-23');
    expect(columns).toHaveLength(2);
    expect(columns[1][0].date).toBe('2026-09-21'); // this week's Monday
    expect(columns[0][0].date).toBe('2026-09-14'); // previous Monday
    expect(columns[1][6].date).toBe('2026-09-27');
  });

  it('flags today and future days', () => {
    const [week] = buildCalendarColumns(1, '2026-09-23');
    expect(week.find((cell) => cell.isToday)?.date).toBe('2026-09-23');
    expect(week.filter((cell) => cell.isFuture).map((cell) => cell.date)).toEqual([
      '2026-09-24',
      '2026-09-25',
      '2026-09-26',
      '2026-09-27',
    ]);
  });
});

describe('monthLabelsFor', () => {
  it('labels the first column of each month', () => {
    const columns = buildCalendarColumns(12, '2026-09-23');
    const labels = monthLabelsFor(columns);
    expect(labels.map((l) => l.label)).toEqual(['Jul', 'Aug', 'Sep']);
  });

  it('drops a leading label that would collide with the next one', () => {
    // Weeks starting 2026-08-31 (Aug) then 2026-09-07 (Sep): only one column of August.
    const columns = buildCalendarColumns(4, '2026-09-23');
    expect(monthLabelsFor(columns).map((l) => l.label)).toEqual(['Sep']);
  });
});

describe('relativeLevel', () => {
  it('buckets counts into quartiles of the busiest day', () => {
    expect(relativeLevel(0, 8)).toBe(0);
    expect(relativeLevel(1, 8)).toBe(1);
    expect(relativeLevel(3, 8)).toBe(2);
    expect(relativeLevel(5, 8)).toBe(3);
    expect(relativeLevel(8, 8)).toBe(4);
  });

  it('is zero when there is no activity at all', () => {
    expect(relativeLevel(3, 0)).toBe(0);
  });
});

describe('formatShortDate', () => {
  it('formats as a short month and day', () => {
    expect(formatShortDate('2026-09-07')).toBe('Sep 7');
  });
});
