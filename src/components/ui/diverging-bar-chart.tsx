import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Text } from './text';

const BAR_MAX = 18;
const BAR_THIN = 5;
const MIN_BAR = 3;
const GROUP_AIR = 6;

interface DivergingBarChartProps {
  /** Signed values; above zero grows up, below zero grows down. */
  values: readonly number[];
  labels: readonly string[];
  positiveColor: string;
  negativeColor: string;
  height?: number;
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  /** Columns that can't be picked (e.g. months still to come). */
  isInactive?: (index: number) => boolean;
  accessibilityLabel: string;
}

function Bar({
  value,
  scale,
  zeroY,
  color,
  width,
  left,
  delay,
}: {
  value: number;
  /** Pixels per unit. */
  scale: number;
  zeroY: number;
  color: string;
  width: number;
  left: number;
  delay: number;
}) {
  const reduceMotion = useReduceMotion();
  const target = value === 0 ? 0 : Math.max(MIN_BAR, Math.abs(value) * scale);
  const size = useSharedValue(reduceMotion ? target : 0);
  const up = value > 0;

  useEffect(() => {
    size.value = reduceMotion ? target : withDelay(delay, withTiming(target, { duration: 420 }));
  }, [target, delay, reduceMotion, size]);

  // Rounded at the data end, square on the zero line, whichever way the bar grows.
  const style = useAnimatedStyle(() => (up ? { top: zeroY - size.value, height: size.value } : { top: zeroY, height: size.value }));

  return (
    <Animated.View
      style={[
        styles.bar,
        { left, width, backgroundColor: color },
        up ? styles.roundTop : styles.roundBottom,
        style,
      ]}
    />
  );
}

/**
 * Above or below a zero line on one scale — money kept in green, overspent in
 * orange. The colour only repeats what the direction already says, so the
 * chart still reads without it. Tap a column to pick it.
 */
export function DivergingBarChart({
  values,
  labels,
  positiveColor,
  negativeColor,
  height = 120,
  selectedIndex,
  onSelectIndex,
  isInactive,
  accessibilityLabel,
}: DivergingBarChartProps) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);

  const peak = Math.max(0, ...values);
  const trough = Math.min(0, ...values);
  const span = peak - trough;
  // With nothing either side yet, keep the zero line mid-plot rather than pinned to an edge.
  const zeroY = span === 0 ? height / 2 : height * (peak / span);
  const scale = span === 0 ? 0 : height / span;
  const slot = values.length > 0 ? width / values.length : 0;
  const barWidth = Math.max(BAR_THIN, Math.min(BAR_MAX, Math.floor(slot - GROUP_AIR)));

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.plot, { height }]} onLayout={onLayout}>
        <View
          style={[styles.zero, { top: zeroY, backgroundColor: theme.colors.borderStrong }]}
          pointerEvents="none"
        />
        {width > 0
          ? values.map((value, index) => {
              const inactive = isInactive?.(index) ?? false;
              return (
                <Pressable
                  key={`${labels[index] ?? ''}-${index}`}
                  disabled={inactive}
                  onPress={() => {
                    Haptics.selectionAsync();
                    onSelectIndex(index);
                  }}
                  style={[
                    styles.column,
                    { left: index * slot, width: slot, height },
                    { opacity: selectedIndex === null || selectedIndex === index ? 1 : 0.4 },
                  ]}
                >
                  <Bar
                    value={value}
                    scale={scale}
                    zeroY={zeroY}
                    color={value >= 0 ? positiveColor : negativeColor}
                    width={barWidth}
                    left={(slot - barWidth) / 2}
                    delay={index * 40}
                  />
                </Pressable>
              );
            })
          : null}
      </View>
      <View style={styles.labels}>
        {labels.map((label, index) => (
          <Text
            key={`${label}-${index}`}
            variant="labelMedium"
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: index === selectedIndex ? theme.colors.textPrimary : theme.colors.textTertiary,
                opacity: isInactive?.(index) ? 0.5 : 1,
              },
            ]}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    position: 'relative',
  },
  zero: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  column: {
    position: 'absolute',
    top: 0,
  },
  bar: {
    position: 'absolute',
  },
  roundTop: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  roundBottom: {
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  labels: {
    flexDirection: 'row',
    marginTop: 6,
  },
  label: {
    flex: 1,
    textAlign: 'center',
  },
});
