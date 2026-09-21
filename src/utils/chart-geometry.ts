export interface Point {
  x: number;
  y: number;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * A smooth SVG path through `points` (sorted by x) using monotone cubic
 * interpolation (Fritsch–Carlson). Unlike a plain Catmull-Rom curve it never
 * overshoots between points, so a zero day can't dip below the baseline and
 * a peak never looks higher than it was.
 */
export function monotonePath(points: readonly Point[]): string {
  const n = points.length;
  if (n === 0) return '';
  if (n === 1) return `M${round(points[0].x)},${round(points[0].y)}`;

  const dx: number[] = [];
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x);
    slope.push(dx[i] === 0 ? 0 : (points[i + 1].y - points[i].y) / dx[i]);
  }

  const tangent: number[] = [slope[0]];
  for (let i = 1; i < n - 1; i++) {
    tangent.push(slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2);
  }
  tangent.push(slope[n - 2]);

  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      tangent[i] = 0;
      tangent[i + 1] = 0;
      continue;
    }
    const a = tangent[i] / slope[i];
    const b = tangent[i + 1] / slope[i];
    const sum = a * a + b * b;
    if (sum > 9) {
      const scale = 3 / Math.sqrt(sum);
      tangent[i] = scale * a * slope[i];
      tangent[i + 1] = scale * b * slope[i];
    }
  }

  let path = `M${round(points[0].x)},${round(points[0].y)}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const third = dx[i] / 3;
    path +=
      ` C${round(p0.x + third)},${round(p0.y + tangent[i] * third)}` +
      ` ${round(p1.x - third)},${round(p1.y - tangent[i + 1] * third)}` +
      ` ${round(p1.x)},${round(p1.y)}`;
  }
  return path;
}

/** Point on a circle: 0° is 12 o'clock, angles grow clockwise (screen coordinates). */
export function polarPoint(cx: number, cy: number, radius: number, angleDeg: number): Point {
  const radians = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}
