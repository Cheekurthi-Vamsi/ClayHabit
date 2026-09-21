import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';

import { Text } from './text';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MIN_BAR = 6;

interface WeekBarChartProps {
  /** Seven values, Monday first. */
  values: number[];
  /** Index (0 = Monday) of today, or null when showing a past week. */
  todayIndex: number | null;
  gradient: GradientStops;
  height?: number;
}

function Bar({
  value,
  max,
  height,
  index,
  isToday,
  isFuture,
  gradient,
}: {
  value: number;
  max: number;
  height: number;
  index: number;
  isToday: boolean;
  isFuture: boolean;
  gradient: GradientStops;
}) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  // Leave headroom so the value label above the tallest bar stays inside the chart.
  const target = max === 0 ? MIN_BAR : Math.max(MIN_BAR, (value / max) * (height - 20));
  const barHeight = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    barHeight.value = reduceMotion
      ? target
      : withDelay(index * 55, withSpring(target, { damping: 16, stiffness: 140 }));
  }, [target, index, reduceMotion, barHeight]);

  const animatedStyle = useAnimatedStyle(() => ({ height: barHeight.value }));

  return (
    <View style={styles.column}>
      <View style={[styles.barArea, { height }]}>
        {isToday && value > 0 ? (
          <Text variant="caption" color="primary" style={styles.valueLabel}>
            {value}
          </Text>
        ) : null}
        <Animated.View
          style={[
            styles.bar,
            {
              borderRadius: 8,
              backgroundColor: isFuture || value === 0 ? theme.colors.surfaceMuted : undefined,
              opacity: isToday || isFuture ? 1 : 0.55,
            },
            animatedStyle,
          ]}
        >
          {!isFuture && value > 0 ? (
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
        style={{ color: isToday ? theme.colors.primary : theme.colors.textTertiary }}
      >
        {DAY_LABELS[index]}
      </Text>
    </View>
  );
}

export function WeekBarChart({ values, todayIndex, gradient, height = 96 }: WeekBarChartProps) {
  const max = Math.max(0, ...values);
  const total = values.reduce((sum, value) => sum + value, 0);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${total} completed this week. ${values
        .map((value, index) => `${DAY_LABELS[index]} ${value}`)
        .join(', ')}`}
    >
      {values.map((value, index) => (
        <Bar
          key={index}
          value={value}
          max={max}
          height={height}
          index={index}
          isToday={index === todayIndex}
          isFuture={todayIndex !== null && index > todayIndex}
          gradient={gradient}
        />
      ))}
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
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 18,
    overflow: 'hidden',
  },
  valueLabel: {
    marginBottom: 4,
  },
});
