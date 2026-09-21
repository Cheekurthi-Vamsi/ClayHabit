import type { SQLiteDatabase } from 'expo-sqlite';

import type { CategoryColor, CategoryKind, FinCategory } from '@/domain/finance/entities';
import { isHabitColor } from '@/theme/habit-palette';
import { generateId } from '@/utils/id';

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

const NAME_MAX = 30;

export interface CategoryInput {
  name: string;
  emoji: string;
  color: CategoryColor;
}

async function assertNameFree(db: SQLiteDatabase, kind: CategoryKind, name: string, exceptId?: string) {
  const clash = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM fin_categories
     WHERE kind = ? AND is_archived = 0 AND LOWER(name) = LOWER(?) AND id != ?`,
    kind,
    name,
    exceptId ?? '',
  );
  if (clash) throw new Error(`You already have a category called "${name}".`);
}

function clean(input: CategoryInput): CategoryInput {
  const name = input.name.trim().slice(0, NAME_MAX);
  if (!name) throw new Error('Give the category a name.');
  const emoji = input.emoji.trim() || '🏷️';
  return { name, emoji, color: isHabitColor(input.color) ? input.color : 'purple' };
}

export async function create(db: SQLiteDatabase, kind: CategoryKind, input: CategoryInput): Promise<FinCategory> {
  const { name, emoji, color } = clean(input);
  await assertNameFree(db, kind, name);
  const id = generateId();
  const now = new Date().toISOString();
  const order = await db.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM fin_categories WHERE kind = ?',
    kind,
  );
  await db.runAsync(
    `INSERT INTO fin_categories (id, kind, name, emoji, color, sort_order, is_archived, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    id,
    kind,
    name,
    emoji,
    color,
    order?.next ?? 0,
    now,
    now,
  );
  return (await getById(db, id))!;
}

export async function update(db: SQLiteDatabase, id: string, input: CategoryInput): Promise<void> {
  const existing = await getById(db, id);
  if (!existing) throw new Error('That category no longer exists.');
  const { name, emoji, color } = clean(input);
  await assertNameFree(db, existing.kind, name, id);
  await db.runAsync(
    'UPDATE fin_categories SET name = ?, emoji = ?, color = ?, updated_at = ? WHERE id = ?',
    name,
    emoji,
    color,
    new Date().toISOString(),
    id,
  );
}

/**
 * Hides a category from pickers. Its past transactions keep pointing at it,
 * so history still shows the right name — nothing is deleted.
 */
export async function archive(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE fin_categories SET is_archived = 1, updated_at = ? WHERE id = ?',
    new Date().toISOString(),
    id,
  );
}

/** Swaps a category with its neighbour in the list. */
export async function move(db: SQLiteDatabase, id: string, direction: 'up' | 'down'): Promise<void> {
  const current = await getById(db, id);
  if (!current) return;
  const list = await listByKind(db, current.kind);
  const index = list.findIndex((category) => category.id === id);
  const neighbour = list[direction === 'up' ? index - 1 : index + 1];
  if (!neighbour) return;

  // Re-number the whole list so equal sort orders (possible after imports) can't stall a move.
  const reordered = [...list];
  reordered[index] = neighbour;
  reordered[direction === 'up' ? index - 1 : index + 1] = current;
  for (const [position, category] of reordered.entries()) {
    await db.runAsync('UPDATE fin_categories SET sort_order = ? WHERE id = ?', position, category.id);
  }
}
