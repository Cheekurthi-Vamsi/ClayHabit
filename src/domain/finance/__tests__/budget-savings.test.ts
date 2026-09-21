import { budgetMessage, budgetUsage } from '../budget';
import { projectSavings } from '../savings';

describe('budgetUsage', () => {
  it('reports spent, remaining and ratio', () => {
    const usage = budgetUsage(540_000, 800_000);
    expect(usage.remainingMinor).toBe(260_000);
    expect(usage.ratio).toBeCloseTo(0.675);
    expect(usage.state).toBe('healthy');
  });

  it('moves through the states at 70%, 90% and past 100%', () => {
    expect(budgetUsage(69, 100).state).toBe('healthy');
    expect(budgetUsage(70, 100).state).toBe('warning');
    expect(budgetUsage(90, 100).state).toBe('near-limit');
    expect(budgetUsage(100, 100).state).toBe('near-limit');
    expect(budgetUsage(101, 100).state).toBe('exceeded');
    expect(budgetUsage(150, 100).remainingMinor).toBe(-50);
  });

  it('handles a zero limit without dividing by zero', () => {
    expect(budgetUsage(0, 0)).toMatchObject({ ratio: 0, state: 'healthy' });
    expect(budgetUsage(10, 0)).toMatchObject({ ratio: Infinity, state: 'exceeded' });
  });

  it('describes each state in neutral language', () => {
    expect(budgetMessage('Food', budgetUsage(95, 100))).toBe('Food spending is approaching your monthly limit.');
    expect(budgetMessage('Food', budgetUsage(75, 100))).toBe("Food spending has used 75% of this month's budget.");
    for (const spent of [10, 75, 95, 120]) {
      expect(budgetMessage('Food', budgetUsage(spent, 100))).not.toMatch(/fail|bad|over-?spent|!/i);
    }
  });
});

describe('projectSavings', () => {
  // The spec's own example: a ₹45,000 laptop, ₹18,500 saved, target March 2027.
  const laptop = { targetMinor: 4_500_000, savedMinor: 1_850_000, targetDate: '2027-03-21', today: '2026-09-21' };

  it('computes remaining amount and progress', () => {
    const projection = projectSavings(laptop);
    expect(projection.remainingMinor).toBe(2_650_000);
    expect(projection.progress).toBeCloseTo(0.411, 3);
    expect(projection.isComplete).toBe(false);
  });

  it('spreads what is left over the months and weeks remaining', () => {
    const projection = projectSavings(laptop);
    expect(projection.monthsRemaining).toBe(6);
    expect(projection.daysRemaining).toBe(181);
    // ₹26,500 over 6 months ≈ ₹4,417/month; over 26 weeks ≈ ₹1,020/week.
    expect(projection.requiredMonthlyMinor).toBe(441_667);
    expect(projection.requiredWeeklyMinor).toBe(101_924);
  });

  it('projects completion at the current contribution rate', () => {
    const projection = projectSavings({ ...laptop, monthlyContributionMinor: 450_000 });
    // ceil(26,500 / 4,500) = 6 months.
    expect(projection.projectedCompletion).toBe('2027-03-21');
    expect(projection.onTrack).toBe(true);

    const slower = projectSavings({ ...laptop, monthlyContributionMinor: 300_000 });
    expect(slower.projectedCompletion).toBe('2027-06-21');
    expect(slower.onTrack).toBe(false);
  });

  it('asks for the whole remainder when the target is this month or already passed', () => {
    const soon = projectSavings({ ...laptop, targetDate: '2026-09-30' });
    expect(soon.monthsRemaining).toBe(1);
    expect(soon.requiredMonthlyMinor).toBe(2_650_000);

    const past = projectSavings({ ...laptop, targetDate: '2026-08-01' });
    expect(past.isPastTarget).toBe(true);
    expect(past.daysRemaining).toBe(0);
    expect(past.requiredMonthlyMinor).toBe(2_650_000);
  });

  it('handles open-ended and finished plans', () => {
    const open = projectSavings({ ...laptop, targetDate: null });
    expect(open).toMatchObject({ daysRemaining: null, monthsRemaining: null, requiredMonthlyMinor: null, onTrack: null });

    const done = projectSavings({ ...laptop, savedMinor: 5_000_000 });
    expect(done).toMatchObject({ remainingMinor: 0, progress: 1, isComplete: true, requiredMonthlyMinor: 0, onTrack: true });
  });

  it('counts the leap day', () => {
    const projection = projectSavings({ ...laptop, today: '2028-02-01', targetDate: '2028-03-01' });
    expect(projection.daysRemaining).toBe(29);
  });
});
