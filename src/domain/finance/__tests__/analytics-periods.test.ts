import {
  averageMonthlySpend,
  cumulative,
  monthEndBalances,
  monthFlows,
  paymentShares,
  peakFlow,
  rankLevels,
  summarizePeriod,
  weekdayAverages,
  yearSummaries,
} from '../analytics';
import { EMPTY_TOTALS } from '../entities';

describe('summarizePeriod', () => {
  it('derives net, kept and the savings rate', () => {
    const summary = summarizePeriod({ income: 1_000, expense: 600, saving: 200, withdrawal: 50, transfer: 100 });
    expect(summary).toEqual({ income: 1_000, expense: 600, net: 400, kept: 300, setAside: 150, savingsRate: 0.3 });
  });

  it('has no rate without income', () => {
    expect(summarizePeriod({ ...EMPTY_TOTALS, expense: 500 }).savingsRate).toBeNull();
  });
});

describe('yearSummaries', () => {
  it('rolls months up into years, newest first, zero-filling empty years', () => {
    const years = yearSummaries(
      {
        '2024-03': { ...EMPTY_TOTALS, income: 1_000, expense: 400 },
        '2024-11': { ...EMPTY_TOTALS, income: 1_000, expense: 800 },
        '2026-01': { ...EMPTY_TOTALS, expense: 300 },
      },
      2024,
      2026,
    );
    expect(years.map((year) => year.year)).toEqual([2026, 2025, 2024]);
    expect(years[2]).toMatchObject({ income: 2_000, expense: 1_200, net: 800, activeMonths: 2, savingsRate: 0.4 });
    expect(years[1]).toMatchObject({ income: 0, expense: 0, activeMonths: 0, savingsRate: null });
    expect(years[0]).toMatchObject({ expense: 300, net: -300 });
  });
});

describe('monthEndBalances', () => {
  it('runs the balance forward month by month', () => {
    expect(
      monthEndBalances(
        500,
        {
          '2026-01': { ...EMPTY_TOTALS, income: 1_000, expense: 300 },
          '2026-03': { ...EMPTY_TOTALS, expense: 100, saving: 200, withdrawal: 50 },
        },
        ['2026-01', '2026-02', '2026-03'],
      ),
    ).toEqual([1_200, 1_200, 950]);
  });
});

describe('cumulative', () => {
  it('adds up as it goes', () => {
    expect(cumulative([3, 0, 2])).toEqual([3, 3, 5]);
    expect(cumulative([])).toEqual([]);
  });
});

describe('weekdayAverages', () => {
  it('divides each weekday by how often it occurs in the range', () => {
    // 2026-09-01 is a Tuesday, so Sep 1–15 holds three Tuesdays and two of every other weekday.
    const bySqlWeekday = [0, 0, 300, 0, 0, 0, 100]; // Tuesday 300, Saturday 100
    expect(weekdayAverages(bySqlWeekday, '2026-09-01', '2026-09-15')).toEqual([0, 100, 0, 0, 0, 50, 0]);
  });

  it('handles a single day', () => {
    // 2026-09-20 is a Sunday: last in a Monday-first week.
    expect(weekdayAverages([70, 0, 0, 0, 0, 0, 0], '2026-09-20', '2026-09-20')).toEqual([0, 0, 0, 0, 0, 0, 70]);
  });
});

describe('rankLevels', () => {
  it('ranks days that had spending into quarters', () => {
    const level = rankLevels([10, 20, 30, 40, 0, 0]);
    expect([0, 10, 20, 30, 40].map(level)).toEqual([0, 1, 2, 3, 4]);
  });

  it('keeps one huge day from washing out the rest', () => {
    const level = rankLevels([100, 110, 120, 50_000]);
    expect(level(120)).toBe(3);
    expect(level(50_000)).toBe(4);
  });

  it('shows equal days at full strength and nothing at zero', () => {
    expect(rankLevels([5, 5, 5])(5)).toBe(4);
    expect(rankLevels([])(10)).toBe(0);
  });
});

describe('peakFlow', () => {
  it('picks the highest among active flows, earliest on a tie', () => {
    const flows = [
      { key: 'a', income: 0, expense: 0, net: 0 },
      { key: 'b', income: 100, expense: 80, net: 20 },
      { key: 'c', income: 50, expense: 80, net: -30 },
    ];
    expect(peakFlow(flows, (flow) => flow.expense)?.key).toBe('b');
    expect(peakFlow(flows, (flow) => flow.net)?.key).toBe('b');
    expect(peakFlow([flows[0]], (flow) => flow.net)).toBeNull();
  });
});

describe('paymentShares', () => {
  it('labels, shares and sorts payment methods', () => {
    const shares = paymentShares([
      { method: 'cash', totalMinor: 250, count: 2 },
      { method: 'upi', totalMinor: 750, count: 5 },
      { method: null, totalMinor: 0, count: 0 },
    ]);
    expect(shares.map((share) => [share.label, share.share])).toEqual([
      ['UPI', 0.75],
      ['Cash', 0.25],
    ]);
    expect(paymentShares([{ method: null, totalMinor: 10, count: 1 }])[0].label).toBe('Not set');
  });
});

describe('averageMonthlySpend for a finished span', () => {
  it('counts the last month when it is complete', () => {
    const flows = monthFlows(
      { '2025-11': { ...EMPTY_TOTALS, expense: 1_000 }, '2025-12': { ...EMPTY_TOTALS, expense: 3_000 } },
      '2025-12',
      2,
    );
    expect(averageMonthlySpend(flows, false)).toBe(2_000);
    expect(averageMonthlySpend(flows)).toBe(1_000);
  });
});
