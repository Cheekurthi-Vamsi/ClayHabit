import { buildBentoRows } from '../bento';

const items = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `n${index}`, long: false }));

describe('buildBentoRows', () => {
  it('opens with a wide card, then pairs, with every fifth spot wide', () => {
    const rows = buildBentoRows(items(7), { columns: 2 });
    expect(rows.map((row) => (row.kind === 'wide' ? 'W' : `G${row.items.length}`))).toEqual(['W', 'G2', 'G2', 'W', 'G1']);
  });

  it('lets long items take a full row without losing any item', () => {
    const list = items(4);
    list[2].long = true;
    const rows = buildBentoRows(list, { columns: 2, prefersWide: (item) => item.long });
    const ids = rows.flatMap((row) => (row.kind === 'wide' ? [row.item.id] : row.items.map((item) => item.id)));
    expect(ids).toEqual(['n0', 'n1', 'n2', 'n3']);
    expect(rows[2]).toMatchObject({ kind: 'wide', key: 'n2' });
  });

  it('fills three columns on tablets and handles an empty list', () => {
    expect(buildBentoRows(items(4), { columns: 3 })).toEqual([
      expect.objectContaining({ kind: 'wide' }),
      expect.objectContaining({ kind: 'group', items: expect.arrayContaining([expect.anything()]) }),
    ]);
    expect(buildBentoRows([], { columns: 2 })).toEqual([]);
  });
});
