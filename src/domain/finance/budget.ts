/**
 * Budget usage. The language is deliberately neutral — a budget is a plan the
 * person set, not a test they pass or fail.
 */

export type BudgetState = 'healthy' | 'warning' | 'near-limit' | 'exceeded';

/** Share of the limit at which each state begins. */
export const BUDGET_THRESHOLDS = { warning: 0.7, nearLimit: 0.9 } as const;

export interface BudgetUsage {
  spentMinor: number;
  limitMinor: number;
  /** Negative once spending passes the limit. */
  remainingMinor: number;
  /** spent / limit; 0 for an unused budget, Infinity for spending against a zero limit. */
  ratio: number;
  state: BudgetState;
}

export function budgetUsage(spentMinor: number, limitMinor: number): BudgetUsage {
  const ratio = limitMinor > 0 ? spentMinor / limitMinor : spentMinor > 0 ? Infinity : 0;
  const state: BudgetState =
    ratio > 1
      ? 'exceeded'
      : ratio >= BUDGET_THRESHOLDS.nearLimit
        ? 'near-limit'
        : ratio >= BUDGET_THRESHOLDS.warning
          ? 'warning'
          : 'healthy';
  return { spentMinor, limitMinor, remainingMinor: limitMinor - spentMinor, ratio, state };
}

/** A calm, factual one-liner for the budget's state. */
export function budgetMessage(categoryName: string, usage: BudgetUsage): string {
  switch (usage.state) {
    case 'healthy':
      return `${categoryName} spending is within this month's budget.`;
    case 'warning':
      return `${categoryName} spending has used ${Math.round(usage.ratio * 100)}% of this month's budget.`;
    case 'near-limit':
      return `${categoryName} spending is approaching your monthly limit.`;
    case 'exceeded':
      return `${categoryName} spending has gone past this month's budget.`;
  }
}
