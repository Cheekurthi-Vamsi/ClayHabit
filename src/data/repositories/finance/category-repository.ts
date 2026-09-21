import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryKind, FinCategory } from '@/domain/finance/entities';
import { isHabitColor } from '@/theme/habit-palette';

export interface CategoryRow {
  id: string;
  kind: string;
  name: string;
  emoji: string;
  color: string;
  sort_order: number;
  is_archived: number;
}

export function toCategory(row: CategoryRow): FinCategory {
  return {
    id: row.id,
    kind: row.kind === 'income' ? 'income' : 'expense',
    name: row.name,
    emoji: row.emoji,
    color: isHabitColor(row.color) ? row.color : 'purple',
    sortOrder: row.sort_order,
    isArchived: row.is_archived === 1,
  };
}

/** Active categories of a kind, in the person's order. */
export async function listByKind(db: SQLiteDatabase, kind: CategoryKind): Promise<FinCategory[]> {
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT * FROM fin_categories WHERE kind = ? AND is_archived = 0 ORDER BY sort_order ASC, name ASC',
    kind,
  );
  return rows.map(toCategory);
}

export async function getById(db: SQLiteDatabase, id: string): Promise<FinCategory | null> {
  const row = await db.getFirstAsync<CategoryRow>('SELECT * FROM fin_categories WHERE id = ?', id);
  return row ? toCategory(row) : null;
}
