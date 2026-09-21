import { formatTime12h, greetingForHour, todayIso } from '../date';

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
});
