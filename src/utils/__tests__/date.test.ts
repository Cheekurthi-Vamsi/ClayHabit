import { combineDateAndTime, formatTime12h, getMonthGridDates, greetingForHour, todayIso } from '../date';

describe('date utils', () => {
  it('formats today as an ISO date string', () => {
    expect(todayIso()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('picks a greeting based on the hour', () => {
    expect(greetingForHour(3)).toBe('Still up');
    expect(greetingForHour(8)).toBe('Good morning');
    expect(greetingForHour(14)).toBe('Good afternoon');
    expect(greetingForHour(19)).toBe('Good evening');
    expect(greetingForHour(23)).toBe('Good night');
  });

  it('formats 24h time strings as 12h', () => {
    expect(formatTime12h(null)).toBeNull();
    expect(formatTime12h('09:30')).toBe('9:30 AM');
    expect(formatTime12h('00:05')).toBe('12:05 AM');
    expect(formatTime12h('18:00')).toBe('6:00 PM');
  });

  it('combines a local date and time into a Date at that local moment', () => {
    const date = combineDateAndTime('2026-09-21', '09:30');
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(8); // 0-indexed: September
    expect(date.getDate()).toBe(21);
    expect(date.getHours()).toBe(9);
    expect(date.getMinutes()).toBe(30);
  });

  it('builds a fixed 42-day Monday-start grid padded into adjacent months', () => {
    // September 2026 starts on a Tuesday, so the grid pads back to Monday Aug 31.
    const grid = getMonthGridDates(2026, 8);
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-08-31');
    expect(grid[1]).toBe('2026-09-01');
    expect(grid).toContain('2026-09-30');
    expect(grid[grid.length - 1]).toBe('2026-10-11');
  });
});
