import type { SQLiteDatabase } from 'expo-sqlite';

import { MAX_AMOUNT_MINOR } from '@/domain/finance/currency';
import type {
  FinTransactionView,
  NewSavingsPlanInput,
  SavingsPlan,
  SavingsPlanWithProgress,
  SavingsPriority,
  UpdateSavingsPlanInput,
} from '@/domain/finance/entities';
import { isHabitColor } from '@/theme/habit-palette';
import { addDaysIso } from '@/utils/date';
import { generateId } from '@/utils/id';

import * as transactionRepository from './transaction-repository';

/** Window used for "your current contribution rate". */
const RECENT_DAYS = 90;
const NAME_MAX = 40;

interface PlanRow {
  id: string;
  name: string;
  emoji: string;
  color: string;
  target_minor: number;
  target_date: string | null;
  monthly_contribution_minor: number | null;
  priority: number;
  notes: string | null;
  is_archived: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface PlanProgressRow extends PlanRow {
  saved_minor: number | null;
  recent_minor: number | null;
  entry_count: number;
}

function toPriority(value: number): SavingsPriority {
  return value === 1 || value === 3 ? value : 2;
}

function toPlan(row: PlanRow): SavingsPlan {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    color: isHabitColor(row.color) ? row.color : 'mint',
    targetMinor: row.target_minor,
    targetDate: row.target_date,
    monthlyContributionMinor: row.monthly_contribution_minor,
    priority: toPriority(row.priority),
    notes: row.notes,
    isArchived: row.is_archived === 1,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toProgress(row: PlanProgressRow): SavingsPlanWithProgress {
  return {
    ...toPlan(row),
    savedMinor: row.saved_minor ?? 0,
    // 90 days ≈ 3 months: the net contribution over that window, per month.
    recentMonthlyMinor: Math.round((row.recent_minor ?? 0) / 3),
    entryCount: row.entry_count,
  };
}

/** Saved (deposits − withdrawals) and recent contributions come straight from the ledger. */
function progressQuery(where: string): string {
  return `
    SELECT p.*,
      SUM(CASE WHEN t.type = 'saving' THEN t.amount_minor WHEN t.type = 'withdrawal' THEN -t.amount_minor ELSE 0 END) AS saved_minor,
      SUM(CASE WHEN t.occurred_on >= ? THEN
            CASE WHEN t.type = 'saving' THEN t.amount_minor WHEN t.type = 'withdrawal' THEN -t.amount_minor ELSE 0 END
          ELSE 0 END) AS recent_minor,
      COUNT(t.id) AS entry_count
    FROM fin_savings_plans p
    LEFT JOIN fin_transactions t ON t.savings_plan_id = p.id AND t.deleted_at IS NULL
    WHERE ${where}
    GROUP BY p.id
    ORDER BY p.is_archived ASC, (p.completed_at IS NOT NULL) ASC, p.priority ASC, p.sort_order ASC, p.created_at ASC
  `;
}

// ---- validation -----------------------------------------------------------

function cleanName(name: string | undefined): string {
  const trimmed = name?.trim() ?? '';
  if (!trimmed) throw new Error('Give this plan a name.');
  return trimmed.slice(0, NAME_MAX);
}

function assertTarget(targetMinor: number) {
  if (!Number.isInteger(targetMinor) || targetMinor <= 0 || targetMinor > MAX_AMOUNT_MINOR) {
    throw new Error('Set a target greater than zero.');
  }
}

function cleanMonthly(value: number | null | undefined): number | null {
  if (value === null || value === undefined || value === 0) return null;
  if (!Number.isInteger(value) || value < 0 || value > MAX_AMOUNT_MINOR) {
    throw new Error('Monthly contribution must be a positive amount.');
  }
  return value;
}

function cleanDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`Not a valid date: ${value}`);
  return value;
}

// ---- reads ----------------------------------------------------------------

export async function listPlans(
  db: SQLiteDatabase,
  { includeArchived = false, today }: { includeArchived?: boolean; today: string },
): Promise<SavingsPlanWithProgress[]> {
  const rows = await db.getAllAsync<PlanProgressRow>(
    progressQuery(includeArchived ? '1 = 1' : 'p.is_archived = 0'),
    addDaysIso(today, -(RECENT_DAYS - 1)),
  );
  return rows.map(toProgress);
}

export async function getPlan(db: SQLiteDatabase, id: string, today: string): Promise<SavingsPlanWithProgress | null> {
  const row = await db.getFirstAsync<PlanProgressRow>(progressQuery('p.id = ?'), addDaysIso(today, -(RECENT_DAYS - 1)), id);
  return row ? toProgress(row) : null;
}

/** Deposits and withdrawals for one plan, newest first. */
export async function listEntries(db: SQLiteDatabase, planId: string): Promise<FinTransactionView[]> {
  return transactionRepository.listFiltered(db, { savingsPlanId: planId, limit: 500 });
}

/** Everything currently held across all plans. */
export async function totalSaved(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ total: number | null }>(
    `SELECT SUM(CASE WHEN type = 'saving' THEN amount_minor WHEN type = 'withdrawal' THEN -amount_minor ELSE 0 END) AS total
     FROM fin_transactions WHERE deleted_at IS NULL AND savings_plan_id IS NOT NULL`,
  );
  return row?.total ?? 0;
}

// ---- writes ---------------------------------------------------------------

export async function createPlan(db: SQLiteDatabase, input: NewSavingsPlanInput): Promise<SavingsPlan> {
  const name = cleanName(input.name);
  assertTarget(input.targetMinor);
  const id = generateId();
  const now = new Date().toISOString();
  const order = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM fin_savings_plans',
  );

  await db.runAsync(
    `INSERT INTO fin_savings_plans
       (id, name, emoji, color, target_minor, target_date, monthly_contribution_minor, priority, notes,
        sort_order, is_archived, completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)`,
    id,
    name,
    input.emoji?.trim() || '🎯',
    input.color && isHabitColor(input.color) ? input.color : 'mint',
    input.targetMinor,
    cleanDate(input.targetDate),
    cleanMonthly(input.monthlyContributionMinor),
    toPriority(input.priority ?? 2),
    input.notes?.trim() || null,
    order?.next ?? 0,
    now,
    now,
  );
  const row = await db.getFirstAsync<PlanRow>('SELECT * FROM fin_savings_plans WHERE id = ?', id);
  return toPlan(row!);
}

export async function updatePlan(db: SQLiteDatabase, id: string, input: UpdateSavingsPlanInput): Promise<void> {
  const row = await db.getFirstAsync<PlanRow>('SELECT * FROM fin_savings_plans WHERE id = ?', id);
  if (!row) throw new Error('This savings plan no longer exists.');
  const existing = toPlan(row);

  const targetMinor = input.targetMinor ?? existing.targetMinor;
  assertTarget(targetMinor);

  await db.runAsync(
    `UPDATE fin_savings_plans
     SET name = ?, emoji = ?, color = ?, target_minor = ?, target_date = ?, monthly_contribution_minor = ?,
         priority = ?, notes = ?, updated_at = ?
     WHERE id = ?`,
    input.name !== undefined ? cleanName(input.name) : existing.name,
    input.emoji?.trim() || existing.emoji,
    input.color && isHabitColor(input.color) ? input.color : existing.color,
    targetMinor,
    input.targetDate !== undefined ? cleanDate(input.targetDate) : existing.targetDate,
    input.monthlyContributionMinor !== undefined ? cleanMonthly(input.monthlyContributionMinor) : existing.monthlyContributionMinor,
    input.priority !== undefined ? toPriority(input.priority) : existing.priority,
    input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    new Date().toISOString(),
    id,
  );
  await syncCompletion(db, id);
}

export async function setArchived(db: SQLiteDatabase, id: string, archived: boolean): Promise<void> {
  await db.runAsync(
    'UPDATE fin_savings_plans SET is_archived = ?, updated_at = ? WHERE id = ?',
    archived ? 1 : 0,
    new Date().toISOString(),
    id,
  );
}

/**
 * Deletes a plan that never had money in it. A plan with history is archived
 * instead, so no financial record is ever lost.
 */
export async function removePlan(db: SQLiteDatabase, id: string): Promise<'deleted' | 'archived'> {
  const used = await db.getFirstAsync<{ n: number }>(
    'SELECT COUNT(*) AS n FROM fin_transactions WHERE savings_plan_id = ?',
    id,
  );
  if ((used?.n ?? 0) > 0) {
    await setArchived(db, id, true);
    return 'archived';
  }
  await db.runAsync('DELETE FROM fin_savings_plans WHERE id = ?', id);
  return 'deleted';
}

export interface SavingsEntryInput {
  planId: string;
  kind: 'deposit' | 'withdraw';
  amountMinor: number;
  occurredOn: string;
  note?: string | null;
}

/**
 * Moves money into or out of a plan. It's recorded as a `saving` or
 * `withdrawal` transaction, so the available balance stays correct.
 * A withdrawal can't take out more than the plan holds.
 */
export async function addEntry(db: SQLiteDatabase, input: SavingsEntryInput, today: string): Promise<void> {
  const plan = await getPlan(db, input.planId, today);
  if (!plan) throw new Error('This savings plan no longer exists.');
  if (input.kind === 'withdraw' && input.amountMinor > plan.savedMinor) {
    throw new Error('That’s more than this plan holds.');
  }

  await transactionRepository.create(db, {
    type: input.kind === 'deposit' ? 'saving' : 'withdrawal',
    amountMinor: input.amountMinor,
    savingsPlanId: input.planId,
    occurredOn: input.occurredOn,
    note: input.note,
  });
  await syncCompletion(db, input.planId);
}

/** Removes one deposit or withdrawal (soft delete) and re-checks completion. */
export async function removeEntry(db: SQLiteDatabase, planId: string, transactionId: string): Promise<void> {
  await transactionRepository.softDelete(db, transactionId);
  await syncCompletion(db, planId);
}

/** Stamps (or clears) `completed_at` as the saved amount crosses the target. */
async function syncCompletion(db: SQLiteDatabase, planId: string): Promise<void> {
  const row = await db.getFirstAsync<{ target_minor: number; completed_at: string | null; saved: number | null }>(
    `SELECT p.target_minor, p.completed_at,
       (SELECT SUM(CASE WHEN type = 'saving' THEN amount_minor WHEN type = 'withdrawal' THEN -amount_minor ELSE 0 END)
        FROM fin_transactions WHERE savings_plan_id = p.id AND deleted_at IS NULL) AS saved
     FROM fin_savings_plans p WHERE p.id = ?`,
    planId,
  );
  if (!row) return;
  const complete = (row.saved ?? 0) >= row.target_minor;
  if (complete && !row.completed_at) {
    await db.runAsync('UPDATE fin_savings_plans SET completed_at = ? WHERE id = ?', new Date().toISOString(), planId);
  } else if (!complete && row.completed_at) {
    await db.runAsync('UPDATE fin_savings_plans SET completed_at = NULL WHERE id = ?', planId);
  }
}
