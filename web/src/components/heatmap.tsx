import { useEffect, useRef } from 'react';

import type { HeatmapLevel } from '@/domain/services/habit-engine';
import { monthLabelsFor, type CalendarCell } from '@/domain/services/heatmap';
import { HEATMAP_LEVEL_OPACITY } from '@/theme/habit-palette';

/*
 * The phone's contribution grid (src/components/ui/heatmap.tsx), drawn the same
 * way on the web: one SVG, Monday-first columns, rounded cells at the palette's
 * stepped opacities, empty days in `surfaceMuted`, today outlined.
 */

const WEEKDAY_LABELS: { row: number; label: string }[] = [
  { row: 0, label: 'Mon' },
  { row: 2, label: 'Wed' },
  { row: 4, label: 'Fri' },
];
const MONTH_ROW_HEIGHT = 18;
const WEEKDAY_COLUMN_WIDTH = 28;

interface HeatmapProps {
  columns: CalendarCell[][];
  levelFor: (date: string) => HeatmapLevel;
  color: string;
  cellSize?: number;
  gap?: number;
  showMonthLabels?: boolean;
  showWeekdayLabels?: boolean;
  /** Scrolls horizontally, pinned to today, when the grid is wider than its box. */
  scrollable?: boolean;
  /** Optional text per day for the hover tooltip. */
  titleFor?: (date: string) => string;
  label?: string;
}

export function Heatmap({
  columns,
  levelFor,
  color,
  cellSize = 12,
  gap = 3,
  showMonthLabels = false,
  showWeekdayLabels = false,
  scrollable = false,
  titleFor,
  label,
}: HeatmapProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const step = cellSize + gap;
  const width = columns.length * step - gap;
  const height = 7 * step - gap;
  const radius = Math.max(2, Math.round(cellSize / 4));
  const months = showMonthLabels ? monthLabelsFor(columns) : [];

  useEffect(() => {
    if (scrollable && scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [scrollable, columns.length]);

  const grid = (
    <div style={{ width, flex: 'none' }}>
      {showMonthLabels ? (
        <div style={{ position: 'relative', height: MONTH_ROW_HEIGHT, width }}>
          {months.map((month) => (
            <span key={`${month.index}-${month.label}`} className="t-caption c-tertiary" style={{ position: 'absolute', top: 0, left: month.index * step }}>
              {month.label}
            </span>
          ))}
        </div>
      ) : null}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label} style={{ display: 'block' }}>
        {columns.map((week, col) =>
          week.map((cell, row) => {
            if (cell.isFuture || cell.isOutside) return null;
            const level = levelFor(cell.date);
            return (
              <rect
                key={cell.date}
                x={col * step}
                y={row * step}
                width={cellSize}
                height={cellSize}
                rx={radius}
                ry={radius}
                fill={level === 0 ? 'var(--color-surface-muted)' : color}
                fillOpacity={level === 0 ? 1 : HEATMAP_LEVEL_OPACITY[level]}
                stroke={cell.isToday ? 'var(--color-text-primary)' : 'none'}
                strokeOpacity={0.35}
                strokeWidth={1}
              >
                {titleFor ? <title>{titleFor(cell.date)}</title> : null}
              </rect>
            );
          }),
        )}
      </svg>
    </div>
  );

  return (
    <div style={{ display: 'flex', minWidth: 0 }}>
      {showWeekdayLabels ? (
        <div style={{ position: 'relative', width: WEEKDAY_COLUMN_WIDTH, height, marginTop: showMonthLabels ? MONTH_ROW_HEIGHT : 0, flex: 'none' }}>
          {WEEKDAY_LABELS.map(({ row, label: day }) => (
            <span key={day} className="t-caption c-tertiary" style={{ position: 'absolute', left: 0, top: row * step, lineHeight: `${cellSize}px` }}>
              {day}
            </span>
          ))}
        </div>
      ) : null}
      {scrollable ? (
        <div ref={scroller} className="heatmap-scroll">
          {grid}
        </div>
      ) : (
        grid
      )}
    </div>
  );
}

export function HeatmapLegend({ color }: { color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} aria-hidden>
      <span className="t-caption c-tertiary">Less</span>
      {HEATMAP_LEVEL_OPACITY.map((opacity, level) => (
        <span
          key={level}
          style={{
            width: 10,
            height: 10,
            borderRadius: 3,
            background: level === 0 ? 'var(--color-surface-muted)' : color,
            opacity: level === 0 ? 1 : opacity,
          }}
        />
      ))}
      <span className="t-caption c-tertiary">More</span>
    </div>
  );
}
