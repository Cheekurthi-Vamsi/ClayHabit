import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, Line, Pattern, Rect } from 'react-native-svg';

import { Text } from '@/components/ui';
import { useAppTheme } from '@/theme';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const GAP = 8;
const CAP = 10;
/** Even an empty day gets a stub, so the week still reads as seven columns. */
const MIN_RATIO = 0.16;

interface WeekColumnsProps {
  values: number[];
  todayIndex: number;
  height?: number;
}

/**
 * The week as seven columns, after the month bars in images/Dashboard
 * design 3.jpg: past days hatched, today solid ink with a lime cap, days
 * still ahead as dashed outlines. Heights are relative to the week's best day.
 */
export function WeekColumns({ values, todayIndex, height = 96 }: WeekColumnsProps) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(1, ...values);
  const columnWidth = width > 0 ? (width - GAP * 6) / 7 : 0;
  const hatch = theme.scheme === 'dark' ? 'rgba(189, 216, 233, 0.28)' : 'rgba(10, 65, 116, 0.22)';

  const summary = values.map((value, index) => `${DAY_NAMES[index]} ${value}`).join(', ');

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={`Completed this week: ${summary}`}>
      <View style={{ height }} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {width > 0 ? (
          <Svg width={width} height={height}>
            <Defs>
              <Pattern id="week-hatch" width={7} height={7} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <Line x1={0} y1={0} x2={0} y2={7} stroke={hatch} strokeWidth={2.5} />
              </Pattern>
            </Defs>
            {values.map((value, index) => {
              const x = index * (columnWidth + GAP);
              const future = todayIndex >= 0 && index > todayIndex;
              const ratio = future ? MIN_RATIO : Math.max(MIN_RATIO, value / max);
              const barHeight = Math.max(CAP * 2, ratio * height);
              const y = height - barHeight;
              const radius = Math.min(12, columnWidth / 2);

              if (index === todayIndex) {
                return (
                  <G key={index}>
                    <Rect x={x} y={y} width={columnWidth} height={barHeight} rx={radius} fill={theme.colors.panel} />
                    <Rect x={x} y={y} width={columnWidth} height={CAP * 2} rx={radius} fill={theme.colors.highlight} />
                    <Rect x={x} y={y + CAP} width={columnWidth} height={CAP} fill={theme.colors.panel} />
                  </G>
                );
              }
              if (future) {
                return (
                  <Rect
                    key={index}
                    x={x + 0.75}
                    y={y + 0.75}
                    width={columnWidth - 1.5}
                    height={barHeight - 1.5}
                    rx={radius}
                    fill="none"
                    stroke={theme.colors.borderStrong}
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                  />
                );
              }
              return (
                <G key={index}>
                  <Rect x={x} y={y} width={columnWidth} height={barHeight} rx={radius} fill={theme.colors.surface} />
                  <Rect x={x} y={y} width={columnWidth} height={barHeight} rx={radius} fill="url(#week-hatch)" />
                  <Rect
                    x={x + 0.5}
                    y={y + 0.5}
                    width={columnWidth - 1}
                    height={barHeight - 1}
                    rx={radius}
                    fill="none"
                    stroke={theme.colors.borderStrong}
                    strokeWidth={1}
                  />
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      <View style={styles.labels}>
        {DAY_LETTERS.map((letter, index) => (
          <View
            key={index}
            style={[
              styles.label,
              index === todayIndex ? { backgroundColor: theme.colors.panel, borderRadius: 999 } : null,
            ]}
          >
            <Text
              variant="caption"
              style={{ color: index === todayIndex ? theme.colors.highlight : theme.colors.textTertiary }}
            >
              {letter}
            </Text>
          </View>
        ))}
      </View>
    </View>
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
});
