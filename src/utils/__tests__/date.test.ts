import {
  addDaysIso,
  combineDateAndTime,
  formatRelativeTime,
  formatTime12h,
  getMonthGridDates,
  greetingForHour,
  startOfWeekIso,
  todayIso,
} from '../date';

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

  it('adds days across month boundaries in local time', () => {
    expect(addDaysIso('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDaysIso('2026-10-01', -1)).toBe('2026-09-30');
  });

  it('finds the Monday that starts the week', () => {
    expect(startOfWeekIso('2026-09-23')).toBe('2026-09-21'); // Wed → Mon
    expect(startOfWeekIso('2026-09-27')).toBe('2026-09-21'); // Sun → Mon
    expect(startOfWeekIso('2026-09-21')).toBe('2026-09-21');
  });

  it('describes elapsed time relative to now', () => {
    const now = new Date('2026-09-21T12:00:00Z').getTime();
    expect(formatRelativeTime('2026-09-21T11:59:40Z', now)).toBe('Just now');
    expect(formatRelativeTime('2026-09-21T11:48:00Z', now)).toBe('12 min ago');
    expect(formatRelativeTime('2026-09-21T09:00:00Z', now)).toBe('3h ago');
    expect(formatRelativeTime('2026-09-19T12:00:00Z', now)).toBe('2d ago');
  });
});
