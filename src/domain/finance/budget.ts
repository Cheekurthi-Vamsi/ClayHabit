import { OVERALL_BUDGET, type Budget, type BudgetScope, type CategoryColor, type MonthKey } from './entities';

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

export interface BudgetSubject {
  id: string;
  name: string;
  emoji: string;
  color: CategoryColor;
}

export interface BudgetLine {
  scope: BudgetScope;
  categoryId: string | null;
  name: string;
  emoji: string;
  color: CategoryColor;
  startsMonth: MonthKey;
  usage: BudgetUsage;
}

export interface BudgetPicture {
  /** The whole-month spending limit, if one is set. */
  overall: BudgetLine | null;
  /** Category budgets, the most-used first. */
  lines: BudgetLine[];
  /** Categories with spending this month but no budget, largest first. */
  unbudgeted: (BudgetSubject & { spentMinor: number })[];
  /** Everything spent in the month, budgeted or not. */
  totalSpentMinor: number;
}

/**
 * Joins the month's budgets with what was actually spent. Budgets for
 * categories that no longer exist are skipped rather than shown nameless.
 */
export function buildBudgetPicture(
  budgets: readonly Budget[],
  categories: readonly BudgetSubject[],
  spentByCategory: Readonly<Record<string, number>>,
  totalSpentMinor: number,
): BudgetPicture {
  const byId = new Map(categories.map((category) => [category.id, category]));
  let overall: BudgetLine | null = null;
  const lines: BudgetLine[] = [];

  for (const budget of budgets) {
    if (budget.scope === OVERALL_BUDGET) {
      overall = {
        scope: budget.scope,
        categoryId: null,
        name: 'All spending',
        emoji: '🧾',
        color: 'purple',
        startsMonth: budget.startsMonth,
        usage: budgetUsage(totalSpentMinor, budget.limitMinor),
      };
      continue;
    }
    const category = budget.categoryId ? byId.get(budget.categoryId) : undefined;
    if (!category) continue;
    lines.push({
      scope: budget.scope,
      categoryId: category.id,
      name: category.name,
      emoji: category.emoji,
      color: category.color,
      startsMonth: budget.startsMonth,
      usage: budgetUsage(spentByCategory[category.id] ?? 0, budget.limitMinor),
    });
  }

  lines.sort((a, b) => b.usage.ratio - a.usage.ratio || a.name.localeCompare(b.name));

  const budgeted = new Set(lines.map((line) => line.categoryId));
  const unbudgeted = categories
    .filter((category) => !budgeted.has(category.id) && (spentByCategory[category.id] ?? 0) > 0)
    .map((category) => ({ ...category, spentMinor: spentByCategory[category.id] }))
    .sort((a, b) => b.spentMinor - a.spentMinor);

  return { overall, lines, unbudgeted, totalSpentMinor };
}
