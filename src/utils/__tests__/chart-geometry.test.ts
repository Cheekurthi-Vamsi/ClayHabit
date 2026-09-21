import { monotonePath, polarPoint } from '../chart-geometry';

/** Every y coordinate in a path string (M/C/L commands with "x,y" pairs). */
function yValues(path: string): number[] {
  return [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((match) => Number(match[2]));
}

describe('monotonePath', () => {
  it('handles empty and single-point input', () => {
    expect(monotonePath([])).toBe('');
    expect(monotonePath([{ x: 3, y: 4 }])).toBe('M3,4');
  });

  it('starts at the first point and ends at the last', () => {
    const path = monotonePath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 5 },
    ]);
    expect(path.startsWith('M0,10')).toBe(true);
    expect(path.endsWith('20,5')).toBe(true);
  });

  it('never overshoots the data, so zero days stay on the baseline', () => {
    // A spike between two zero days: a naive smooth curve would dip below y=100.
    const points = [
      { x: 0, y: 100 },
      { x: 10, y: 100 },
      { x: 20, y: 0 },
      { x: 30, y: 100 },
      { x: 40, y: 100 },
    ];
    for (const y of yValues(monotonePath(points))) {
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(100);
    }
  });

  it('draws a flat series as a flat line', () => {
    const path = monotonePath([
      { x: 0, y: 50 },
      { x: 10, y: 50 },
      { x: 20, y: 50 },
    ]);
    expect(new Set(yValues(path))).toEqual(new Set([50]));
  });
});

describe('polarPoint', () => {
  it('puts 0° at 12 o’clock and turns clockwise', () => {
    const top = polarPoint(0, 0, 10, 0);
    expect(top.x).toBeCloseTo(0);
    expect(top.y).toBeCloseTo(-10);

    const right = polarPoint(0, 0, 10, 90);
    expect(right.x).toBeCloseTo(10);
    expect(right.y).toBeCloseTo(0);

    const bottom = polarPoint(5, 5, 10, 180);
    expect(bottom.x).toBeCloseTo(5);
    expect(bottom.y).toBeCloseTo(15);
  });
});
