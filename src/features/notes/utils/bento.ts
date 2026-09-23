export type BentoRow<T> = { kind: 'wide'; key: string; item: T } | { kind: 'group'; key: string; items: T[] };

interface BentoOptions<T> {
  /** Cards per row for regular cards: 2 on phones, 3 on tablets. */
  columns: number;
  /** Items that deserve a full-width card (long checklists, rich previews). */
  prefersWide?: (item: T) => boolean;
}

/**
 * Lays cards out in bento rows so a list of notes isn't a wall of identical
 * tiles: the first card and every fifth spot go full width, as does
 * anything `prefersWide` picks; everything else fills rows of `columns`.
 * Pure and stable, so a FlatList can virtualise the rows.
 */
export function buildBentoRows<T extends { id: string }>(items: T[], { columns, prefersWide }: BentoOptions<T>): BentoRow<T>[] {
  const rows: BentoRow<T>[] = [];
  let pending: T[] = [];
  let slot = 0;

  const flush = () => {
    if (pending.length === 0) return;
    rows.push({ kind: 'group', key: pending.map((item) => item.id).join('|'), items: pending });
    pending = [];
  };

  for (const item of items) {
    const wide = slot % 5 === 0 || (prefersWide?.(item) ?? false);
    if (wide) {
      flush();
      rows.push({ kind: 'wide', key: item.id, item });
    } else {
      pending.push(item);
      if (pending.length === columns) flush();
    }
    slot++;
  }
  flush();
  return rows;
}
