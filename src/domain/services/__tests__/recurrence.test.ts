import { nextOccurrence } from '../recurrence';

describe('nextOccurrence', () => {
  it('advances daily tasks by one day', () => {
    expect(nextOccurrence('2026-09-21', 'daily')).toBe('2026-09-22');
  });

  it('advances weekly tasks by seven days', () => {
    expect(nextOccurrence('2026-09-21', 'weekly')).toBe('2026-09-28');
  });

  it('skips weekends for weekday tasks', () => {
    // 2026-09-18 is a Friday
    expect(nextOccurrence('2026-09-18', 'weekdays')).toBe('2026-09-21');
  });

  it('advances a weekday task from Sunday to Monday', () => {
    // 2026-09-20 is a Sunday
    expect(nextOccurrence('2026-09-20', 'weekdays')).toBe('2026-09-21');
  });

  it('handles month boundaries', () => {
    expect(nextOccurrence('2026-09-30', 'daily')).toBe('2026-10-01');
  });
});
