import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as budgetRepository from '@/data/repositories/finance/budget-repository';
import * as categoryRepository from '@/data/repositories/finance/category-repository';
import * as savingsRepository from '@/data/repositories/finance/savings-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type {
  CategoryKind,
  MonthKey,
  NewSavingsPlanInput,
  NewTransactionInput,
  UpdateSavingsPlanInput,
  UpdateTransactionInput,
} from '@/domain/finance/entities';
import { monthEnd, monthStart } from '@/domain/finance/month';
import type { StatsPeriod } from '@/domain/finance/period';
import { todayIso } from '@/utils/date';

import { loadBudgetPicture } from './budgets';
import { loadOverview } from './overview';
import { loadFinanceStats } from './stats';

/** Every finance query lives under this key, so one invalidation refreshes the whole workspace. */
const FINANCE = 'finance';

function useInvalidateFinance() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [FINANCE] });
}

export function useFinanceOverview({ enabled = true }: { enabled?: boolean } = {}) {
  const db = useSQLiteContext();
  const today = todayIso();
  return useQuery({
    queryKey: [FINANCE, 'overview', today],
    queryFn: () => loadOverview(db, today),
    enabled,
    // Keep showing the last render while a refetch runs instead of flashing skeletons.
    placeholderData: (previous) => previous,
  });
}

export function useFinanceAccount() {
  const db = useSQLiteContext();
  return useQuery({ queryKey: [FINANCE, 'account'], queryFn: () => accountRepository.getPrimary(db) });
}

/** The display currency, defaulting to INR until the account has loaded. */
export function useCurrency(): string {
  return useFinanceAccount().data?.currency ?? 'INR';
}

export function useCategories(kind: CategoryKind) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'categories', kind],
    queryFn: () => categoryRepository.listByKind(db, kind),
  });
}

export function useMonthTransactions(monthKey: MonthKey) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'transactions', monthKey],
    queryFn: () => transactionRepository.listBetween(db, monthStart(monthKey), monthEnd(monthKey)),
    placeholderData: (previous) => previous,
  });
}

export function useMonthTotals(monthKey: MonthKey) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'totals', monthKey],
    queryFn: () =>
      transactionRepository.totalsBetween(db, { from: monthStart(monthKey), to: monthEnd(monthKey) }),
    placeholderData: (previous) => previous,
  });
}

export function useTransaction(id: string | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'transaction', id],
    queryFn: () => transactionRepository.getById(db, id!),
    enabled: Boolean(id),
  });
}

export function useCreateTransaction() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: NewTransactionInput) => transactionRepository.create(db, input),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) =>
      transactionRepository.update(db, id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTransaction() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (id: string) => transactionRepository.softDelete(db, id),
    onSuccess: invalidate,
  });
}

export function useUpdateAccount() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: accountRepository.UpdateAccountInput) => accountRepository.updatePrimary(db, input),
    onSuccess: invalidate,
  });
}

// ---- search ---------------------------------------------------------------

export function useTransactionSearch(filter: transactionRepository.TransactionFilter, enabled: boolean) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'search', filter],
    queryFn: () => transactionRepository.listFiltered(db, filter),
    enabled,
    placeholderData: (previous) => previous,
  });
}

// ---- categories -----------------------------------------------------------

export function useCategoryMutations() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return {
    create: useMutation({
      mutationFn: ({ kind, input }: { kind: CategoryKind; input: categoryRepository.CategoryInput }) =>
        categoryRepository.create(db, kind, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: categoryRepository.CategoryInput }) =>
        categoryRepository.update(db, id, input),
      onSuccess: invalidate,
    }),
    archive: useMutation({
      mutationFn: (id: string) => categoryRepository.archive(db, id),
      onSuccess: invalidate,
    }),
    move: useMutation({
      mutationFn: ({ id, direction }: { id: string; direction: 'up' | 'down' }) =>
        categoryRepository.move(db, id, direction),
      onSuccess: invalidate,
    }),
  };
}

export function useCategory(id: string | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'category', id],
    queryFn: () => categoryRepository.getById(db, id!),
    enabled: Boolean(id),
  });
}

// ---- budgets --------------------------------------------------------------

export function useBudgetPicture(month: MonthKey) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'budgets', month],
    queryFn: () => loadBudgetPicture(db, month),
    placeholderData: (previous) => previous,
  });
}

export function useSetBudget() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: { categoryId: string | null; amountMinor: number; month: MonthKey }) =>
      budgetRepository.setBudget(db, input),
    onSuccess: invalidate,
  });
}

export function useRemoveBudget() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (input: { categoryId: string | null; month: MonthKey }) => budgetRepository.removeBudget(db, input),
    onSuccess: invalidate,
  });
}

// ---- savings --------------------------------------------------------------

export function useSavingsPlans() {
  const db = useSQLiteContext();
  const today = todayIso();
  return useQuery({
    queryKey: [FINANCE, 'plans', today],
    queryFn: () => savingsRepository.listPlans(db, { today }),
  });
}

export function useSavingsPlan(id: string | undefined) {
  const db = useSQLiteContext();
  const today = todayIso();
  return useQuery({
    queryKey: [FINANCE, 'plan', id, today],
    queryFn: () => savingsRepository.getPlan(db, id!, today),
    enabled: Boolean(id),
  });
}

export function useSavingsEntries(planId: string | undefined) {
  const db = useSQLiteContext();
  return useQuery({
    queryKey: [FINANCE, 'plan-entries', planId],
    queryFn: () => savingsRepository.listEntries(db, planId!),
    enabled: Boolean(planId),
  });
}

export function useSavingsMutations() {
  const db = useSQLiteContext();
  const invalidate = useInvalidateFinance();
  return {
    create: useMutation({
      mutationFn: (input: NewSavingsPlanInput) => savingsRepository.createPlan(db, input),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateSavingsPlanInput }) =>
        savingsRepository.updatePlan(db, id, input),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: string) => savingsRepository.removePlan(db, id),
      onSuccess: invalidate,
    }),
    addEntry: useMutation({
      mutationFn: (input: savingsRepository.SavingsEntryInput) => savingsRepository.addEntry(db, input, todayIso()),
      onSuccess: invalidate,
    }),
    removeEntry: useMutation({
      mutationFn: ({ planId, transactionId }: { planId: string; transactionId: string }) =>
        savingsRepository.removeEntry(db, planId, transactionId),
      onSuccess: invalidate,
    }),
  };
}

// ---- stats ----------------------------------------------------------------

export function useFinanceStats(period: StatsPeriod) {
  const db = useSQLiteContext();
  const today = todayIso();
  return useQuery({
    queryKey: [FINANCE, 'stats', today, period],
    queryFn: () => loadFinanceStats(db, today, period),
    // Switching periods keeps the last render on screen (dimmed) instead of flashing skeletons.
    placeholderData: (previous) => previous,
  });
}
