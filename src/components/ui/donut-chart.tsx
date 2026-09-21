import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

export interface DonutSegment {
  key: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: readonly DonutSegment[];
  size?: number;
  thickness?: number;
  /** Rendered in the hole. */
  children?: React.ReactNode;
  accessibilityLabel: string;
}

/** Visible gap between neighbouring segments, on top of what the round caps take. */
const GAP = 4;

export function DonutChart({ segments, size = 132, thickness = 16, children, accessibilityLabel }: DonutChartProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const spin = useSharedValue(reduceMotion ? 1 : 0);
  const signature = segments.map((segment) => segment.value).join(',');

  useEffect(() => {
    if (reduceMotion) {
      spin.value = 1;
      return;
    }
    spin.value = 0;
    spin.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
  }, [signature, reduceMotion, spin]);

  const spinStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + spin.value * 0.8,
    transform: [{ rotate: `${(spin.value - 1) * 120}deg` }, { scale: 0.85 + spin.value * 0.15 }],
  }));

  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const visible = segments.filter((segment) => segment.value > 0);
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  // Round caps poke out half the stroke width at each end, so trim that off every arc.
  const trim = visible.length > 1 ? thickness + GAP : 0;

  let start = 0;
  const arcs = visible.map((segment) => {
    const length = (segment.value / total) * circumference;
    const arc = { key: segment.key, color: segment.color, start, dash: Math.max(0.01, length - trim) };
    start += length;
    return arc;
  });

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={theme.colors.surfaceMuted}
          strokeWidth={thickness}
          fill="none"
        />
      </Svg>
      <Animated.View style={[StyleSheet.absoluteFill, spinStyle]}>
        <Svg width={size} height={size}>
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={center}
              cy={center}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${arc.dash} ${circumference}`}
              // Start each arc after the previous one (plus half the trim so gaps are centred).
              strokeDashoffset={-(arc.start + trim / 2)}
              transform={`rotate(-90 ${center} ${center})`}
            />
          ))}
        </Svg>
      </Animated.View>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
