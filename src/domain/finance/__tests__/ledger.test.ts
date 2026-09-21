import { EMPTY_TOTALS, type CategoryTotal } from '../entities';
import {
  availableBalance,
  balanceEffect,
  savedInPlans,
  breakdownByCategory,
  dailyBalances,
  netChange,
  percentDelta,
  summarizeMonth,
} from '../ledger';

describe('balance model', () => {
  it('adds income and subtracts everything else', () => {
    expect(balanceEffect('income', 500)).toBe(500);
    expect(balanceEffect('expense', 500)).toBe(-500);
    expect(balanceEffect('saving', 500)).toBe(-500);
    expect(balanceEffect('transfer', 500)).toBe(-500);
    expect(balanceEffect('withdrawal', 500)).toBe(500);
  });

  it('available = opening + income − expenses − savings − transfers', () => {
    const totals = { income: 6_000_000, expense: 1_750_000, saving: 500_000, withdrawal: 0, transfer: 100_000 };
    expect(netChange(totals)).toBe(3_650_000);
    expect(availableBalance(500_000, totals)).toBe(4_150_000);
  });

  it('returns money taken back out of savings to the available balance', () => {
    const totals = { ...EMPTY_TOTALS, income: 1_000_000, saving: 400_000, withdrawal: 150_000 };
    expect(availableBalance(0, totals)).toBe(750_000);
    expect(savedInPlans(totals)).toBe(250_000);
  });

  it('can go negative rather than hiding an overdraft', () => {
    expect(availableBalance(0, { ...EMPTY_TOTALS, expense: 1_000 })).toBe(-1_000);
  });
});

describe('summarizeMonth', () => {
  const before = { income: 5_000_000, expense: 4_500_000, saving: 0, withdrawal: 0, transfer: 0 };
  const month = { income: 6_000_000, expense: 1_750_000, saving: 800_000, withdrawal: 0, transfer: 0 };

  it('starts from the opening balance plus everything before the month', () => {
    const summary = summarizeMonth(1_000_000, before, month);
    expect(summary.startBalance).toBe(1_500_000);
    expect(summary.net).toBe(3_450_000);
    expect(summary.endBalance).toBe(4_950_000);
  });

  it('counts money set aside as kept, not spent', () => {
    const summary = summarizeMonth(0, EMPTY_TOTALS, month);
    expect(summary.kept).toBe(4_250_000);
    expect(summary.setAside).toBe(800_000);
    expect(summary.savingsRate).toBeCloseTo(4_250_000 / 6_000_000);
  });

  it('has no savings rate without income', () => {
    const summary = summarizeMonth(0, EMPTY_TOTALS, { ...EMPTY_TOTALS, expense: 5_000 });
    expect(summary.savingsRate).toBeNull();
    expect(summary.kept).toBe(-5_000);
  });

  it('handles an empty month', () => {
    const summary = summarizeMonth(250_000, EMPTY_TOTALS, EMPTY_TOTALS);
    expect(summary).toMatchObject({ startBalance: 250_000, endBalance: 250_000, net: 0, savingsRate: null });
  });
});

describe('dailyBalances', () => {
  it('accumulates each day onto the starting balance', () => {
    const dates = ['2026-09-01', '2026-09-02', '2026-09-03'];
    expect(dailyBalances(1_000, { '2026-09-01': 500, '2026-09-03': -200 }, dates)).toEqual([1_500, 1_500, 1_300]);
  });

  it('returns an empty series for no dates', () => {
    expect(dailyBalances(1_000, {}, [])).toEqual([]);
  });
});

describe('percentDelta', () => {
  it('needs a positive baseline', () => {
    expect(percentDelta(120, 100)).toBeCloseTo(20);
    expect(percentDelta(80, 100)).toBeCloseTo(-20);
    expect(percentDelta(50, 0)).toBeNull();
  });
});

describe('breakdownByCategory', () => {
  const make = (name: string, totalMinor: number): CategoryTotal => ({
    categoryId: name,
    name,
    emoji: '•',
    color: 'purple',
    totalMinor,
    count: 1,
  });

  it('sorts by spend and computes shares', () => {
    const result = breakdownByCategory([make('Food', 300), make('Rent', 600), make('Fun', 100)]);
    expect(result.items.map((item) => item.name)).toEqual(['Rent', 'Food', 'Fun']);
    expect(result.items[0].share).toBeCloseTo(0.6);
    expect(result.totalMinor).toBe(1_000);
    expect(result.other).toBeNull();
  });

  it('folds the tail into Other', () => {
    const totals = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, index) => make(name, 700 - index * 100));
    const result = breakdownByCategory(totals, 5);
    expect(result.items).toHaveLength(5);
    expect(result.other).toMatchObject({ totalMinor: 300, categories: 2, count: 2 });
  });

  it('never folds a single leftover category', () => {
    const totals = ['A', 'B', 'C', 'D', 'E', 'F'].map((name, index) => make(name, 600 - index * 100));
    const result = breakdownByCategory(totals, 5);
    expect(result.items).toHaveLength(6);
    expect(result.other).toBeNull();
  });

  it('skips zero totals', () => {
    expect(breakdownByCategory([make('Food', 0)]).items).toEqual([]);
  });
});
