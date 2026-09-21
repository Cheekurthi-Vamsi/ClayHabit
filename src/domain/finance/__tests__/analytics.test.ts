import { averageMonthlySpend, categoryChanges, monthFlows } from '../analytics';
import { EMPTY_TOTALS, type CategoryTotal } from '../entities';

describe('monthFlows', () => {
  it('zero-fills missing months, oldest first, across a year boundary', () => {
    const flows = monthFlows({ '2026-12': { ...EMPTY_TOTALS, income: 500, expense: 200 } }, '2027-02', 4);
    expect(flows.map((flow) => flow.month)).toEqual(['2026-11', '2026-12', '2027-01', '2027-02']);
    expect(flows[1]).toMatchObject({ label: 'Dec', income: 500, expense: 200, net: 300 });
    expect(flows[2]).toMatchObject({ income: 0, expense: 0, net: 0 });
  });
});

describe('averageMonthlySpend', () => {
  it('uses complete months with activity only', () => {
    const flows = monthFlows(
      {
        '2026-07': { ...EMPTY_TOTALS, expense: 1_000 },
        '2026-08': { ...EMPTY_TOTALS, expense: 3_000 },
        '2026-09': { ...EMPTY_TOTALS, expense: 99_999 },
      },
      '2026-09',
      6,
    );
    expect(averageMonthlySpend(flows)).toBe(2_000);
  });

  it('has no average for someone who just started', () => {
    expect(averageMonthlySpend(monthFlows({ '2026-09': { ...EMPTY_TOTALS, expense: 500 } }, '2026-09', 6))).toBeNull();
  });
});

describe('categoryChanges', () => {
  const total = (categoryId: string, totalMinor: number): CategoryTotal => ({
    categoryId,
    name: categoryId,
    emoji: '•',
    color: 'purple',
    totalMinor,
    count: 1,
  });

  it('compares each of this period’s biggest categories with the last', () => {
    const changes = categoryChanges([total('food', 1_120), total('cab', 460), total('new', 50)], [total('food', 1_000), total('cab', 500)]);
    expect(changes.map((change) => [change.name, change.delta === null ? null : Math.round(change.delta)])).toEqual([
      ['food', 12],
      ['cab', -8],
      ['new', null],
    ]);
  });

  it('limits the list', () => {
    expect(categoryChanges(['a', 'b', 'c'].map((id) => total(id, 10)), [], 2)).toHaveLength(2);
  });
});
