import type { SQLiteDatabase } from 'expo-sqlite';

import { PRIMARY_ACCOUNT_ID } from '@/data/db/migrations/0009-finance';
import { isCurrencyCode, MAX_AMOUNT_MINOR, type CurrencyCode } from '@/domain/finance/currency';
import type { FinAccount } from '@/domain/finance/entities';

interface AccountRow {
  id: string;
  name: string;
  currency: string;
  opening_balance_minor: number;
  created_at: string;
  updated_at: string;
}

function toAccount(row: AccountRow): FinAccount {
  return {
    id: row.id,
    name: row.name,
    currency: isCurrencyCode(row.currency) ? row.currency : 'INR',
    openingBalanceMinor: row.opening_balance_minor,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** The account transactions are recorded against. Seeded by migration 0009, so it always exists. */
export async function getPrimary(db: SQLiteDatabase): Promise<FinAccount> {
  const row = await db.getFirstAsync<AccountRow>('SELECT * FROM fin_accounts WHERE id = ?', PRIMARY_ACCOUNT_ID);
  if (!row) throw new Error('The finance account is missing. Restart the app to repair it.');
  return toAccount(row);
}

export interface UpdateAccountInput {
  currency?: CurrencyCode;
  /** May be negative (starting in overdraft), but not beyond the per-amount limit. */
  openingBalanceMinor?: number;
}

export async function updatePrimary(db: SQLiteDatabase, input: UpdateAccountInput): Promise<FinAccount> {
  const existing = await getPrimary(db);

  if (input.currency !== undefined && !isCurrencyCode(input.currency)) {
    throw new Error(`Unsupported currency: ${String(input.currency)}`);
  }
  if (
    input.openingBalanceMinor !== undefined &&
    (!Number.isInteger(input.openingBalanceMinor) || Math.abs(input.openingBalanceMinor) > MAX_AMOUNT_MINOR)
  ) {
    throw new Error('Starting balance must be a whole number of minor units within range.');
  }

  await db.runAsync(
    'UPDATE fin_accounts SET currency = ?, opening_balance_minor = ?, updated_at = ? WHERE id = ?',
    input.currency ?? existing.currency,
    input.openingBalanceMinor ?? existing.openingBalanceMinor,
    new Date().toISOString(),
    existing.id,
  );
  return getPrimary(db);
}
