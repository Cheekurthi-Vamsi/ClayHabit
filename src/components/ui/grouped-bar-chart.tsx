import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Text } from './text';

const BAR_MAX = 14;
const BAR_THIN = 4;
const BAR_GAP = 2;
const MIN_BAR = 3;
/** Air kept either side of each group, so neighbouring groups never touch. */
const GROUP_AIR = 6;

export interface BarGroup {
  label: string;
  /** One value per series, in the same order as `colors`. */
  values: readonly number[];
}

interface GroupedBarChartProps {
  groups: readonly BarGroup[];
  /** Series colours, validated as a set (see the dataviz palette check). */
  colors: readonly string[];
  height?: number;
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  /** Groups that can't be picked (e.g. months still to come); drawn with a faint label. */
  isInactive?: (index: number) => boolean;
  accessibilityLabel: string;
}

function Bar({
  value,
  max,
  plotHeight,
  color,
  delay,
  width,
}: {
  value: number;
  max: number;
  plotHeight: number;
  color: string;
  delay: number;
  width: number;
}) {
  const reduceMotion = useReduceMotion();
  const target = value > 0 && max > 0 ? Math.max(MIN_BAR, (value / max) * plotHeight) : 0;
  const height = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    height.value = reduceMotion ? target : withDelay(delay, withTiming(target, { duration: 420 }));
  }, [target, delay, reduceMotion, height]);

  const style = useAnimatedStyle(() => ({ height: height.value }));
  return <Animated.View style={[styles.bar, { width, backgroundColor: color }, style]} />;
}

/**
 * Series side by side per group, sharing one baseline and one scale. Tap a
 * group to read its values; the others dim so the selection stands out.
 * Bars thin down to fit many groups (twelve months still fit a phone).
 */
export function GroupedBarChart({
  groups,
  colors,
  height = 150,
  selectedIndex,
  onSelectIndex,
  isInactive,
  accessibilityLabel,
}: GroupedBarChartProps) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const max = Math.max(0, ...groups.flatMap((group) => group.values));
  const series = Math.max(1, ...groups.map((group) => group.values.length));
  const slot = groups.length > 0 && width > 0 ? width / groups.length : 0;
  const barWidth =
    slot > 0
      ? Math.max(BAR_THIN, Math.min(BAR_MAX, Math.floor((slot - GROUP_AIR - BAR_GAP * (series - 1)) / series)))
      : BAR_MAX;

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
      <View style={[styles.plot, { height, borderBottomColor: theme.colors.borderStrong }]}>
        {groups.map((group, groupIndex) => {
          const selected = groupIndex === selectedIndex;
          const inactive = isInactive?.(groupIndex) ?? false;
          return (
            <Pressable
              key={`${group.label}-${groupIndex}`}
              disabled={inactive}
              onPress={() => {
                Haptics.selectionAsync();
                onSelectIndex(groupIndex);
              }}
              style={[styles.group, { opacity: selectedIndex === null || selected ? 1 : 0.4 }]}
            >
              {group.values.map((value, seriesIndex) => (
                <Bar
                  key={seriesIndex}
                  value={value}
                  max={max}
                  plotHeight={height - 4}
                  color={colors[seriesIndex] ?? theme.colors.textTertiary}
                  delay={groupIndex * 50}
                  width={barWidth}
                />
              ))}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.labels}>
        {groups.map((group, groupIndex) => (
          <Text
            key={`${group.label}-${groupIndex}`}
            variant="labelMedium"
            numberOfLines={1}
            style={[
              styles.label,
              {
                color: groupIndex === selectedIndex ? theme.colors.textPrimary : theme.colors.textTertiary,
                opacity: isInactive?.(groupIndex) ? 0.5 : 1,
              },
            ]}
          >
            {group.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  group: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  bar: {
    // Rounded data end, square on the baseline.
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
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
