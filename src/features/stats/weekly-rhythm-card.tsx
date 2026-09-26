import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, Pattern, Rect, Text as SvgText } from 'react-native-svg';

import { Text } from '@/components/ui';
import { fontFamily, useAppTheme } from '@/theme';
import { todayIso } from '@/utils/date';

import { ChartCard } from './chart-card';
import { average, indexOfMax, weekdayAverages, WEEKDAY_NAMES } from './insights';

const WEEKS = 12;
const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const CHART_HEIGHT = 150;
const VALUE_SPACE = 20;
const GAP = 10;

function indexOfMin(values: readonly number[]): number | null {
  if (values.every((value) => value === 0)) return null;
  return values.reduce((low, value, index) => (value < values[low] ? index : low), 0);
}

function Stat({ label, value, tone = 'plain' }: { label: string; value: string; tone?: 'plain' | 'lime' }) {
  const theme = useAppTheme();
  const lime = tone === 'lime';
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: lime ? theme.colors.highlight : theme.colors.surfaceMuted, borderRadius: theme.radii.md },
      ]}
    >
      <Text variant="caption" style={{ color: lime ? theme.colors.onHighlight : theme.colors.textSecondary }}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color: lime ? theme.colors.onHighlight : theme.colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

/**
 * Which weekdays you actually get things done, averaged over the last 12
 * weeks: pill columns with the power day in lime, weekends hatched, an
 * average line, and the numbers that matter underneath.
 */
export function WeeklyRhythmCard({ totals }: { totals: Record<string, number> }) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const averages = weekdayAverages(totals, todayIso(), WEEKS);
  const best = indexOfMax(averages);
  const quietest = indexOfMin(averages);
  const mean = average(averages);
  const max = Math.max(...averages, 0.0001);
  const weekdayMean = average(averages.slice(0, 5));
  const weekendMean = average(averages.slice(5));

  const insight =
    best === null
      ? 'Finish a few tasks or habits and your weekly rhythm shows up here.'
      : mean > 0 && averages[best] > mean * 1.05
        ? `${WEEKDAY_NAMES[best]}s are your power day, ${Math.round((averages[best] / mean - 1) * 100)}% above your average.`
        : 'You spread your work evenly across the week.';

  const columnWidth = width > 0 ? (width - GAP * 6) / 7 : 0;
  const plotHeight = CHART_HEIGHT - VALUE_SPACE;
  const barTop = (value: number) => VALUE_SPACE + plotHeight - Math.max(8, (value / max) * plotHeight);
  const averageY = VALUE_SPACE + plotHeight - (mean / max) * plotHeight;

  return (
    <ChartCard title="Weekly rhythm" subtitle={`Average per weekday · last ${WEEKS} weeks`}>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Average per weekday: ${averages
          .map((value, index) => `${WEEKDAY_NAMES[index]} ${value.toFixed(1)}`)
          .join(', ')}`}
      >
        <View style={{ height: CHART_HEIGHT }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
          {width > 0 ? (
            <Svg width={width} height={CHART_HEIGHT}>
              <Defs>
                <Pattern id="rhythm-hatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <Line x1={0} y1={0} x2={0} y2={7} stroke={theme.colors.textTertiary} strokeOpacity={0.35} strokeWidth={2.5} />
                </Pattern>
              </Defs>
              {averages.map((value, index) => {
                const x = index * (columnWidth + GAP);
                const y = barTop(value);
                const height = CHART_HEIGHT - y;
                const isBest = index === best;
                const weekend = index >= 5;
                const radius = Math.min(14, columnWidth / 2);
                return (
                  <G key={index}>
                    {/* The empty track behind every column keeps the seven days readable at zero. */}
                    <Rect x={x} y={VALUE_SPACE} width={columnWidth} height={plotHeight} rx={radius} fill={theme.colors.surfaceMuted} />
                    <Rect
                      x={x}
                      y={y}
                      width={columnWidth}
                      height={height}
                      rx={radius}
                      fill={isBest ? theme.colors.highlight : weekend ? theme.colors.surface : theme.colors.primary}
                      stroke={weekend && !isBest ? theme.colors.borderStrong : 'none'}
                      strokeWidth={weekend && !isBest ? 1 : 0}
                    />
                    {weekend && !isBest ? (
                      <Rect x={x} y={y} width={columnWidth} height={height} rx={radius} fill="url(#rhythm-hatch)" />
                    ) : null}
                    {value > 0 ? (
                      <SvgText
                        x={x + columnWidth / 2}
                        y={y - 6}
                        fontSize={11}
                        fontFamily={fontFamily.bold}
                        fill={isBest ? theme.colors.textPrimary : theme.colors.textSecondary}
                        textAnchor="middle"
                      >
                        {value.toFixed(1)}
                      </SvgText>
                    ) : null}
                  </G>
                );
              })}
              {mean > 0 ? (
                <Line
                  x1={0}
                  x2={width}
                  y1={averageY}
                  y2={averageY}
                  stroke={theme.colors.textPrimary}
                  strokeOpacity={0.5}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                />
              ) : null}
            </Svg>
          ) : null}
        </View>
        <View style={styles.labels}>
          {LETTERS.map((letter, index) => (
            <View
              key={index}
              style={[styles.label, index === best && { backgroundColor: theme.colors.panel, borderRadius: 999 }]}
            >
              <Text variant="caption" style={{ color: index === best ? theme.colors.highlight : theme.colors.textTertiary }}>
                {letter}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.stats}>
        <Stat label="Power day" value={best === null ? '—' : WEEKDAY_NAMES[best].slice(0, 3)} tone="lime" />
        <Stat label="Quietest" value={quietest === null ? '—' : WEEKDAY_NAMES[quietest].slice(0, 3)} />
        <Stat label="Weekday avg" value={weekdayMean.toFixed(1)} />
        <Stat label="Weekend avg" value={weekendMean.toFixed(1)} />
      </View>

      <Text variant="bodySmall" color="textSecondary">
        {insight}
        {mean > 0 ? ' Dashed line: your daily average.' : ''}
      </Text>
    </ChartCard>
  );
}

const styles = StyleSheet.create({
  labels: {
    flexDirection: 'row',
    gap: GAP,
    marginTop: 8,
  },
  label: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flexGrow: 1,
    flexBasis: '22%',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 2,
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    lineHeight: 22,
  },
});
