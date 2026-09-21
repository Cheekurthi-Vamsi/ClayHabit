import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import type { HeatmapLevel } from '@/domain/services/habit-engine';
import { monthLabelsFor, type CalendarCell } from '@/domain/services/heatmap';
import { HEATMAP_LEVEL_OPACITY, useAppTheme } from '@/theme';

import { Text } from './text';

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
  /** Wraps the grid in a horizontal scroller pinned to today; off for grids that fit on screen. */
  scrollable?: boolean;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  accessibilityLabel?: string;
}

/**
 * GitHub/LeetCode-style contribution grid. Drawn as one SVG rather than a
 * View per day — a year is ~370 cells, and several of these can be on
 * screen at once — with a single press handler that maps the touch point
 * back to a cell instead of 370 individual touchables.
 */
export function Heatmap({
  columns,
  levelFor,
  color,
  cellSize = 12,
  gap = 3,
  showMonthLabels = false,
  showWeekdayLabels = false,
  scrollable = false,
  selectedDate,
  onSelectDate,
  accessibilityLabel,
}: HeatmapProps) {
  const theme = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);

  const step = cellSize + gap;
  const width = columns.length * step - gap;
  const height = 7 * step - gap;
  const radius = Math.max(2, Math.round(cellSize / 4));
  const monthLabels = showMonthLabels ? monthLabelsFor(columns) : [];

  const handlePress = (x: number, y: number) => {
    if (!onSelectDate) return;
    const col = Math.floor(x / step);
    const row = Math.floor(y / step);
    const cell = columns[col]?.[row];
    if (cell && !cell.isFuture) onSelectDate(cell.date);
  };

  const grid = (
    <View>
      {showMonthLabels && (
        <View style={{ height: MONTH_ROW_HEIGHT, width }}>
          {monthLabels.map((month) => (
            <Text
              key={`${month.index}-${month.label}`}
              variant="caption"
              color="textTertiary"
              style={[styles.monthLabel, { left: month.index * step }]}
            >
              {month.label}
            </Text>
          ))}
        </View>
      )}
      <Pressable
        disabled={!onSelectDate}
        onPress={(event) => handlePress(event.nativeEvent.locationX, event.nativeEvent.locationY)}
      >
        <Svg width={width} height={height}>
          {columns.map((week, col) =>
            week.map((cell, row) => {
              if (cell.isFuture) return null;
              const level = levelFor(cell.date);
              const isSelected = cell.date === selectedDate;
              return (
                <Rect
                  key={cell.date}
                  x={col * step}
                  y={row * step}
                  width={cellSize}
                  height={cellSize}
                  rx={radius}
                  ry={radius}
                  fill={level === 0 ? theme.colors.surfaceMuted : color}
                  fillOpacity={level === 0 ? 1 : HEATMAP_LEVEL_OPACITY[level]}
                  stroke={isSelected || cell.isToday ? theme.colors.textPrimary : 'none'}
                  strokeOpacity={isSelected ? 0.9 : 0.35}
                  strokeWidth={isSelected ? 1.5 : 1}
                />
              );
            }),
          )}
        </Svg>
      </Pressable>
    </View>
  );

  return (
    <View
      style={styles.row}
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel}
    >
      {showWeekdayLabels && (
        <View
          style={{
            width: WEEKDAY_COLUMN_WIDTH,
            marginTop: showMonthLabels ? MONTH_ROW_HEIGHT : 0,
            height,
          }}
        >
          {WEEKDAY_LABELS.map(({ row, label }) => (
            <Text
              key={label}
              variant="caption"
              color="textTertiary"
              style={[styles.weekdayLabel, { top: row * step, lineHeight: cellSize }]}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
      {scrollable ? (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {grid}
        </ScrollView>
      ) : (
        grid
      )}
    </View>
  );
}

export function HeatmapLegend({ color }: { color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legend}>
      <Text variant="caption" color="textTertiary">
        Less
      </Text>
      {HEATMAP_LEVEL_OPACITY.map((opacity, level) => (
        <View
          key={level}
          style={[
            styles.legendCell,
            level === 0
              ? { backgroundColor: theme.colors.surfaceMuted }
              : { backgroundColor: color, opacity },
          ]}
        />
      ))}
      <Text variant="caption" color="textTertiary">
        More
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  monthLabel: {
    position: 'absolute',
    top: 0,
  },
  weekdayLabel: {
    position: 'absolute',
    left: 0,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendCell: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
});
