import { useEffect, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';
import { monotonePath, type Point } from '@/utils/chart-geometry';

import { Text } from './text';

// Room above the top gridline for its scale label.
const TOP = 22;
const INSET_X = 6;

interface AreaChartProps {
  values: readonly number[];
  gradient: GradientStops;
  height?: number;
  /** Tick labels under the chart, placed at a value index. */
  xLabels?: readonly { index: number; label: string }[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  accessibilityLabel: string;
}

/**
 * A smooth gradient area chart. Drag (or tap) across it to inspect a point;
 * vertical drags still scroll the page.
 */
export function AreaChart({
  values,
  gradient,
  height = 140,
  xLabels,
  selectedIndex,
  onSelectIndex,
  accessibilityLabel,
}: AreaChartProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const signature = values.join(',');

  // Sweep the line in from the left whenever the data changes (e.g. a new range).
  useEffect(() => {
    if (reduceMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
  }, [signature, reduceMotion, reveal]);

  const revealStyle = useAnimatedStyle(() => ({ width: width * reveal.value }));

  const n = values.length;
  const peak = Math.max(0, ...values);
  const max = Math.max(1, peak);
  const plotWidth = Math.max(0, width - INSET_X * 2);
  const plotHeight = height - TOP - 4;
  const step = n > 1 ? plotWidth / (n - 1) : 0;
  const points: Point[] = values.map((value, index) => ({
    x: INSET_X + index * step,
    y: TOP + plotHeight * (1 - value / max),
  }));

  const line = monotonePath(points);
  const area =
    points.length > 1
      ? `${line} L${points[n - 1].x},${height} L${points[0].x},${height} Z`
      : '';
  const selected = selectedIndex !== null ? points[selectedIndex] : null;
  const last = points[n - 1];

  const select = (event: GestureResponderEvent) => {
    if (n === 0 || step === 0) return;
    const index = Math.max(0, Math.min(n - 1, Math.round((event.nativeEvent.locationX - INSET_X) / step)));
    if (index !== selectedIndex) {
      Haptics.selectionAsync();
      onSelectIndex(index);
    }
  };

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  return (
    <View>
      <View
        onLayout={onLayout}
        style={{ height }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
      >
        {width > 0 ? (
          <>
            <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
              {[0, 0.5, 1].map((fraction) => (
                <Line
                  key={fraction}
                  x1={0}
                  x2={width}
                  y1={TOP + plotHeight * fraction}
                  y2={TOP + plotHeight * fraction}
                  stroke={theme.colors.border}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
              ))}
            </Svg>
            {peak > 0 ? (
              <Text variant="caption" color="textTertiary" style={styles.scaleLabel} accessible={false}>
                {formatScale(max)}
              </Text>
            ) : null}

            <Animated.View style={[styles.reveal, { height }, revealStyle]}>
              <Svg width={width} height={height}>
                <Defs>
                  <LinearGradient id="areaStroke" x1="0" y1="0" x2="1" y2="0">
                    {gradient.map((stop, index) => (
                      <Stop key={index} offset={index / Math.max(1, gradient.length - 1)} stopColor={stop} />
                    ))}
                  </LinearGradient>
                  <LinearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor={gradient[0]} stopOpacity={0.18} />
                    <Stop offset="1" stopColor={gradient[gradient.length - 1]} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {area ? <Path d={area} fill="url(#areaFill)" /> : null}
                <Path
                  d={line}
                  stroke="url(#areaStroke)"
                  strokeWidth={2}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {!selected && last ? (
                  <Circle
                    cx={last.x}
                    cy={last.y}
                    r={4.5}
                    fill={gradient[gradient.length - 1]}
                    stroke={theme.colors.surface}
                    strokeWidth={2}
                  />
                ) : null}
              </Svg>
            </Animated.View>

            {selected ? (
              <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Line
                  x1={selected.x}
                  x2={selected.x}
                  y1={TOP}
                  y2={height}
                  stroke={theme.colors.textTertiary}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
                <Circle
                  cx={selected.x}
                  cy={selected.y}
                  r={6}
                  fill={gradient[gradient.length - 1]}
                  stroke={theme.colors.surface}
                  strokeWidth={2}
                />
              </Svg>
            ) : null}

            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponder={() => true}
              onMoveShouldSetResponder={() => true}
              onResponderGrant={select}
              onResponderMove={select}
              onResponderTerminationRequest={() => true}
            />
          </>
        ) : null}
      </View>

      {xLabels && width > 0 ? (
        <View style={styles.labels}>
          {xLabels.map(({ index, label }) => {
            const x = INSET_X + index * step;
            const alignLeft = index === 0;
            const alignRight = index === n - 1;
            return (
              <Text
                key={`${index}-${label}`}
                variant="caption"
                color="textTertiary"
                numberOfLines={1}
                style={[
                  styles.label,
                  alignLeft
                    ? { left: 0, textAlign: 'left' }
                    : alignRight
                      ? { right: 0, textAlign: 'right' }
                      : { left: x - 40, textAlign: 'center' },
                ]}
              >
                {label}
              </Text>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

/** Top-of-scale tick: whole numbers stay whole, anything else gets one decimal. */
function formatScale(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  scaleLabel: {
    position: 'absolute',
    top: TOP - 16,
    left: 0,
  },
  reveal: {
    overflow: 'hidden',
  },
  labels: {
    height: 18,
    marginTop: 6,
  },
  label: {
    position: 'absolute',
    width: 80,
  },
});
