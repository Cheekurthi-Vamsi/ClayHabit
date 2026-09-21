import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { fontFamily, useAppTheme } from '@/theme';
import { polarPoint } from '@/utils/chart-geometry';

interface RadialBarChartProps {
  /** One value per slice, drawn clockwise from 12 o'clock. */
  values: readonly number[];
  size?: number;
  color: string;
  highlightColor: string;
  /** Emphasised slice, e.g. the peak hour. */
  highlightIndex?: number | null;
  /** Labels around the dial as [slice index, text]. */
  ticks?: readonly (readonly [number, string])[];
  children?: React.ReactNode;
  accessibilityLabel: string;
}

/**
 * A dial of radial bars — 24 slices reads like a clock, which makes "when do
 * I get things done" obvious at a glance.
 */
export function RadialBarChart({
  values,
  size = 176,
  color,
  highlightColor,
  highlightIndex = null,
  ticks = [],
  children,
  accessibilityLabel,
}: RadialBarChartProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const grow = useSharedValue(reduceMotion ? 1 : 0.6);
  const signature = values.join(',');

  useEffect(() => {
    if (reduceMotion) {
      grow.value = 1;
      return;
    }
    grow.value = 0.6;
    grow.value = withSpring(1, { damping: 14, stiffness: 120 });
  }, [signature, reduceMotion, grow]);

  const growStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, (grow.value - 0.6) / 0.4 + 0.15),
    transform: [{ scale: grow.value }],
  }));

  const slices = values.length;
  const center = size / 2;
  const labelRoom = 16;
  const inner = size * 0.23;
  const outer = center - labelRoom - 4;
  const barWidth = Math.max(3, ((2 * Math.PI * inner) / slices) * 0.62);
  const max = Math.max(0, ...values);

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={center} cy={center} r={outer + 2} stroke={theme.colors.border} strokeWidth={1} fill="none" />
        <Circle cx={center} cy={center} r={inner - barWidth} stroke={theme.colors.border} strokeWidth={1} fill="none" />
        {ticks.map(([index, label]) => {
          const point = polarPoint(center, center, outer + labelRoom / 2 + 4, (index / slices) * 360);
          return (
            <SvgText
              key={label}
              x={point.x}
              y={point.y + 3.5}
              fontSize={10}
              fontFamily={fontFamily.semiBold}
              fill={theme.colors.textTertiary}
              textAnchor="middle"
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>

      <Animated.View style={[StyleSheet.absoluteFill, growStyle]}>
        <Svg width={size} height={size}>
          {values.map((value, index) => {
            const angle = (index / slices) * 360;
            const length = max > 0 && value > 0 ? 4 + ((outer - inner - 4) * value) / max : 1;
            const from = polarPoint(center, center, inner, angle);
            const to = polarPoint(center, center, inner + length, angle);
            const highlighted = index === highlightIndex;
            const strength = max > 0 ? value / max : 0;
            return (
              <Line
                key={index}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={value === 0 ? theme.colors.surfaceMuted : highlighted ? highlightColor : color}
                strokeOpacity={value === 0 || highlighted ? 1 : 0.35 + strength * 0.65}
                strokeWidth={barWidth}
                strokeLinecap="round"
              />
            );
          })}
        </Svg>
      </Animated.View>

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
