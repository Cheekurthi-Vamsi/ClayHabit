import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';

import * as accountRepository from '@/data/repositories/finance/account-repository';
import * as categoryRepository from '@/data/repositories/finance/category-repository';
import * as transactionRepository from '@/data/repositories/finance/transaction-repository';
import type { CategoryKind, MonthKey, NewTransactionInput, UpdateTransactionInput } from '@/domain/finance/entities';
import { monthEnd, monthStart } from '@/domain/finance/month';
import { todayIso } from '@/utils/date';

import { loadOverview } from './overview';

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
