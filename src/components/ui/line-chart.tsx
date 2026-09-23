import { useEffect, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';
import { monotonePath, type Point } from '@/utils/chart-geometry';

import { Text } from './text';

// Room above the top gridline for its scale label.
const TOP = 22;
const INSET_X = 6;

export interface LineSeries {
  values: readonly number[];
  color: string;
}

interface LineChartProps {
  /** Drawn in order, so put the series that matters last (on top). */
  series: readonly LineSeries[];
  /** Positions along the x axis; a series may stop short of it (a period still in progress). */
  length: number;
  height?: number;
  xLabels?: readonly { index: number; label: string }[];
  selectedIndex: number | null;
  onSelectIndex: (index: number) => void;
  formatScale?: (value: number) => string;
  accessibilityLabel: string;
}

/**
 * Several lines on one shared scale starting at zero. Drag (or tap) across it
 * to inspect a position; vertical drags still scroll the page.
 */
export function LineChart({
  series,
  length,
  height = 150,
  xLabels,
  selectedIndex,
  onSelectIndex,
  formatScale = (value) => String(Math.round(value)),
  accessibilityLabel,
}: LineChartProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const [width, setWidth] = useState(0);
  const reveal = useSharedValue(reduceMotion ? 1 : 0);
  const signature = series.map((line) => line.values.join(',')).join('|');

  // Sweep the lines in from the left whenever the data changes.
  useEffect(() => {
    if (reduceMotion) {
      reveal.value = 1;
      return;
    }
    reveal.value = 0;
    reveal.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.cubic) });
  }, [signature, reduceMotion, reveal]);

  const revealStyle = useAnimatedStyle(() => ({ width: width * reveal.value }));

  const n = Math.max(1, length);
  const peak = Math.max(0, ...series.flatMap((line) => line.values));
  const max = peak > 0 ? peak : 1;
  const plotWidth = Math.max(0, width - INSET_X * 2);
  const plotHeight = height - TOP - 4;
  const step = n > 1 ? plotWidth / (n - 1) : 0;
  const xFor = (index: number) => INSET_X + index * step;
  const yFor = (value: number) => TOP + plotHeight * (1 - value / max);
  const lines = series.map((line) => ({
    color: line.color,
    points: line.values.slice(0, n).map((value, index): Point => ({ x: xFor(index), y: yFor(value) })),
  }));
  const gridYs = [TOP, TOP + plotHeight / 2, TOP + plotHeight];

  const select = (event: GestureResponderEvent) => {
    if (step === 0) return;
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
              {gridYs.map((y, index) => (
                <Line
                  key={index}
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke={index === 2 ? theme.colors.borderStrong : theme.colors.border}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
              ))}
            </Svg>
            {peak > 0 ? (
              <Text variant="caption" color="textTertiary" style={styles.scaleLabel} accessible={false}>
                {formatScale(peak)}
              </Text>
            ) : null}

            <Animated.View style={[styles.reveal, { height }, revealStyle]}>
              <Svg width={width} height={height}>
                {lines.map((line, index) => (
                  <Path
                    key={index}
                    d={monotonePath(line.points)}
                    stroke={line.color}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {selectedIndex === null
                  ? lines.map((line, index) => {
                      const last = line.points[line.points.length - 1];
                      return last ? (
                        <Circle
                          key={index}
                          cx={last.x}
                          cy={last.y}
                          r={4}
                          fill={line.color}
                          stroke={theme.colors.surface}
                          strokeWidth={2}
                        />
                      ) : null;
                    })
                  : null}
              </Svg>
            </Animated.View>

            {selectedIndex !== null ? (
              <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
                <Line
                  x1={xFor(selectedIndex)}
                  x2={xFor(selectedIndex)}
                  y1={TOP}
                  y2={height}
                  stroke={theme.colors.textTertiary}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
                {lines.map((line, index) => {
                  const point = line.points[selectedIndex];
                  return point ? (
                    <Circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={5}
                      fill={line.color}
                      stroke={theme.colors.surface}
                      strokeWidth={2}
                    />
                  ) : null;
                })}
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
            const x = xFor(index);
            return (
              <Text
                key={`${index}-${label}`}
                variant="caption"
                color="textTertiary"
                numberOfLines={1}
                style={[
                  styles.label,
                  index === 0
                    ? { left: 0, textAlign: 'left' }
                    : index === n - 1
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
