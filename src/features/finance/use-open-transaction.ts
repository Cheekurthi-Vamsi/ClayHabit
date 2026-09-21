import { useRouter } from 'expo-router';

import type { FinTransactionView } from '@/domain/finance/entities';

/**
 * Where tapping a transaction goes: savings entries open their plan (they're
 * managed there); everything else opens the edit sheet.
 */
export function useOpenTransaction() {
  const router = useRouter();
  return (transaction: FinTransactionView) => {
    if (transaction.savingsPlanId) {
      router.push(`/fm/savings/${transaction.savingsPlanId}`);
    } else {
      router.push({ pathname: '/modal/transaction', params: { id: transaction.id } });
    }
  };
}
