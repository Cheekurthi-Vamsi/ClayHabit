import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import Svg, { Line } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';

import { Text } from './text';

const MIN_BAR = 4;
/** Caption line height plus the gap to the bar top. */
const LABEL_ROOM = 18;
const VALUE_WIDTH = 60;
/** How far a value label may hang past the plot edge (cards pad 16). */
const OVERHANG = 12;

interface BarChartProps {
  values: readonly number[];
  labels: readonly string[];
  gradient: GradientStops;
  /** Emphasised bar (the others are dimmed), with its value printed above it. */
  highlightIndex?: number | null;
  height?: number;
  formatValue?: (value: number) => string;
  /** Draws a dashed reference line at the mean of `values`. */
  showAverage?: boolean;
  accessibilityLabel: string;
}

function Bar({
  value,
  max,
  plotHeight,
  index,
  emphasized,
  dimmed,
  showValue,
  valueOffset,
  gradient,
  label,
  formatValue,
  onPress,
}: {
  value: number;
  max: number;
  plotHeight: number;
  index: number;
  emphasized: boolean;
  dimmed: boolean;
  showValue: boolean;
  /** Left edge of the value label relative to this column. */
  valueOffset: number;
  gradient: GradientStops;
  label: string;
  formatValue: (value: number) => string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const target = max === 0 || value === 0 ? MIN_BAR : Math.max(MIN_BAR, (value / max) * plotHeight);
  const height = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    height.value = reduceMotion
      ? target
      : withDelay(index * 40, withSpring(target, { damping: 16, stiffness: 140 }));
  }, [target, index, reduceMotion, height]);

  const barStyle = useAnimatedStyle(() => ({ height: height.value }));

  return (
    // The whole column is the hit target, so even thin bars are easy to tap.
    <Pressable onPress={onPress} style={styles.column}>
      <View style={[styles.barArea, { height: plotHeight + LABEL_ROOM }]}>
        {showValue ? (
          <View style={styles.valueSlot}>
            <Text variant="caption" numberOfLines={1} style={[styles.value, { left: valueOffset }]}>
              {formatValue(value)}
            </Text>
          </View>
        ) : null}
        <Animated.View
          style={[
            styles.bar,
            {
              backgroundColor: value === 0 ? theme.colors.surfaceMuted : undefined,
              opacity: dimmed ? 0.42 : 1,
            },
            barStyle,
          ]}
        >
          {value > 0 ? (
            <LinearGradient
              colors={gradient}
              start={{ x: 0.5, y: 1 }}
              end={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          ) : null}
        </Animated.View>
      </View>
      <Text
        variant="labelMedium"
        numberOfLines={1}
        style={{ color: emphasized ? theme.colors.textPrimary : theme.colors.textTertiary }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Columns growing from a shared baseline. `highlightIndex` is emphasised by
 * default; tapping any bar reads out its value instead, tapping it again
 * goes back.
 */
export function BarChart({
  values,
  labels,
  gradient,
  highlightIndex = null,
  height = 110,
  formatValue = (value) => String(Math.round(value)),
  showAverage = false,
  accessibilityLabel,
}: BarChartProps) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  // Remember which data the pick belongs to, so a new range drops it without an effect.
  const signature = values.join(',');
  const [picked, setPicked] = useState<{ index: number; signature: string } | null>(null);
  const pickedIndex = picked?.signature === signature ? picked.index : null;
  const active = pickedIndex ?? highlightIndex;

  const n = values.length;
  const max = Math.max(0, ...values);
  const plotHeight = height - LABEL_ROOM;
  const mean = n ? values.reduce((sum, value) => sum + value, 0) / n : 0;
  const averageY = LABEL_ROOM + plotHeight - (max > 0 ? (mean / max) * plotHeight : 0);
  const columnWidth = n ? width / n : 0;

  // Centre the value label on its column, but keep it from hanging off the chart.
  const valueOffset = (index: number) => {
    const centred = index * columnWidth + (columnWidth - VALUE_WIDTH) / 2;
    const clamped = Math.min(Math.max(centred, -OVERHANG), width - VALUE_WIDTH + OVERHANG);
    return clamped - index * columnWidth;
  };

  const pick = (index: number) => {
    Haptics.selectionAsync();
    setPicked(pickedIndex === index ? null : { index, signature });
  };

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
      <View style={styles.row}>
        {values.map((value, index) => (
          <Bar
            key={index}
            value={value}
            max={max}
            plotHeight={plotHeight}
            index={index}
            emphasized={index === active}
            dimmed={active !== null && index !== active}
            // A tapped bar always reads out, even at zero; the default highlight only when there's something to say.
            showValue={index === active && width > 0 && (value > 0 || index === pickedIndex)}
            valueOffset={valueOffset(index)}
            gradient={gradient}
            label={labels[index] ?? ''}
            formatValue={formatValue}
            onPress={() => pick(index)}
          />
        ))}
      </View>
      {showAverage && mean > 0 && width > 0 ? (
        // A plain View owns pointerEvents: Android can ignore it on an Svg root, which would block the bars.
        <View style={styles.overlay} pointerEvents="none">
          <Svg width={width} height={height}>
            <Line
              x1={0}
              x2={width}
              y1={averageY}
              y2={averageY}
              stroke={theme.colors.textTertiary}
              strokeWidth={1}
              strokeDasharray="4 4"
            />
          </Svg>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  barArea: {
    // Stretch to the column so the bar's percentage width has something to measure against.
    alignSelf: 'stretch',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '58%',
    maxWidth: 22,
    // Rounded data end, square on the baseline.
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    overflow: 'hidden',
  },
  // Sits in the flow just above the bar so it rides the bar's height.
  valueSlot: {
    alignSelf: 'stretch',
    height: 14,
    marginBottom: 4,
  },
  // Wider than a thin column, so values like "1h 35m" never get truncated.
  value: {
    position: 'absolute',
    top: 0,
    width: VALUE_WIDTH,
    textAlign: 'center',
  },
  // Covers only the bar area (labels sit below it), so the line lines up with bar heights.
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
