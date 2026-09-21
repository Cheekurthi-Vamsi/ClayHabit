import type { HabitColor } from '@/theme/habit-palette';

import type { CurrencyCode } from './currency';

/**
 * The financial domain. It shares the database engine, theme and settings
 * with productivity, but none of its tables or types — nothing here imports
 * from tasks, habits or notes, and vice versa.
 */

/** Local calendar month, `YYYY-MM`. */
export type MonthKey = string;

/**
 * - income: money in.
 * - expense: money spent.
 * - saving: money set aside into a savings plan (leaves the spendable balance).
 * - withdrawal: money taken back out of a savings plan (returns to it).
 * - transfer: money moved out to somewhere else you own.
 */
export type TransactionType = 'income' | 'expense' | 'saving' | 'withdrawal' | 'transfer';

export const TRANSACTION_TYPES: readonly TransactionType[] = ['income', 'expense', 'saving', 'withdrawal', 'transfer'];

export type CategoryKind = 'expense' | 'income';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank' | 'wallet' | 'other';

export const PAYMENT_METHODS: readonly { key: PaymentMethod; label: string }[] = [
  { key: 'upi', label: 'UPI' },
  { key: 'card', label: 'Card' },
  { key: 'cash', label: 'Cash' },
  { key: 'bank', label: 'Bank' },
  { key: 'wallet', label: 'Wallet' },
  { key: 'other', label: 'Other' },
];

/** Category tile tints reuse the app-wide accent palette rather than a second one. */
export type CategoryColor = HabitColor;

export interface FinAccount {
  id: string;
  name: string;
  currency: CurrencyCode;
  /** What the account held before the first recorded transaction. */
  openingBalanceMinor: number;
  createdAt: string;
  updatedAt: string;
}

export interface FinCategory {
  id: string;
  kind: CategoryKind;
  name: string;
  emoji: string;
  color: CategoryColor;
  sortOrder: number;
  isArchived: boolean;
}

export interface FinTransaction {
  id: string;
  accountId: string;
  type: TransactionType;
  /** Always positive; `type` says which way the money moved. */
  amountMinor: number;
  currency: CurrencyCode;
  categoryId: string | null;
  /** The savings plan a `saving` / `withdrawal` belongs to. */
  savingsPlanId: string | null;
  /** Local calendar date the money counts toward (`YYYY-MM-DD`). Months and days group on this. */
  occurredOn: string;
  /** Exact instant, for ordering and showing the time of day. */
  occurredAt: string;
  merchant: string | null;
  paymentMethod: PaymentMethod | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A transaction joined with its category, as lists display it. */
export interface FinTransactionView extends FinTransaction {
  category: Pick<FinCategory, 'id' | 'name' | 'emoji' | 'color'> | null;
  savingsPlan: { id: string; name: string; emoji: string } | null;
}

export interface NewTransactionInput {
  type: TransactionType;
  amountMinor: number;
  categoryId?: string | null;
  savingsPlanId?: string | null;
  occurredOn: string;
  occurredAt?: string;
  merchant?: string | null;
  paymentMethod?: PaymentMethod | null;
  note?: string | null;
}

export type UpdateTransactionInput = Partial<NewTransactionInput>;

/** Totals per transaction type for a period, all in minor units. */
export interface TypeTotals {
  income: number;
  expense: number;
  saving: number;
  withdrawal: number;
  transfer: number;
}

export const EMPTY_TOTALS: TypeTotals = { income: 0, expense: 0, saving: 0, withdrawal: 0, transfer: 0 };

export interface CategoryTotal {
  categoryId: string | null;
  name: string;
  emoji: string;
  color: CategoryColor;
  totalMinor: number;
  count: number;
}

/** 1 = high, 2 = medium, 3 = low. */
export type SavingsPriority = 1 | 2 | 3;

export const PRIORITY_LABELS: Record<SavingsPriority, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };

export interface SavingsPlan {
  id: string;
  name: string;
  emoji: string;
  color: CategoryColor;
  targetMinor: number;
  /** Local `YYYY-MM-DD`, or null for an open-ended plan. */
  targetDate: string | null;
  /** What the person plans to put in each month, if they've said. */
  monthlyContributionMinor: number | null;
  priority: SavingsPriority;
  notes: string | null;
  isArchived: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** A plan with the figures derived from its entries. */
export interface SavingsPlanWithProgress extends SavingsPlan {
  /** Deposits minus withdrawals. */
  savedMinor: number;
  /** Net contributions over the last 90 days, as a monthly average. */
  recentMonthlyMinor: number;
  entryCount: number;
}

export interface NewSavingsPlanInput {
  name: string;
  emoji?: string;
  color?: CategoryColor;
  targetMinor: number;
  targetDate?: string | null;
  monthlyContributionMinor?: number | null;
  priority?: SavingsPriority;
  notes?: string | null;
}

export type UpdateSavingsPlanInput = Partial<NewSavingsPlanInput>;

/** `*` is the overall monthly budget; anything else is a category id. */
export type BudgetScope = string;

export const OVERALL_BUDGET: BudgetScope = '*';

/** The budget in force for a month. */
export interface Budget {
  scope: BudgetScope;
  categoryId: string | null;
  limitMinor: number;
  /** The month this limit started applying (`YYYY-MM`). */
  startsMonth: MonthKey;
}
