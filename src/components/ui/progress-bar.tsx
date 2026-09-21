import { useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  /** Takes precedence over `color`. */
  gradient?: GradientStops;
  trackColor?: string;
  height?: number;
  duration?: number;
}

export function ProgressBar({
  progress,
  color,
  gradient,
  trackColor,
  height = 8,
  duration,
}: ProgressBarProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(reduceMotion ? clamped : 0);
  const animationMs = duration ?? theme.motion.duration.slow;

  useEffect(() => {
    width.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: animationMs, easing: Easing.out(Easing.cubic) });
  }, [clamped, reduceMotion, animationMs, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const radius = height / 2;

  return (
    <View
      style={[
        styles.track,
        { height, borderRadius: radius, backgroundColor: trackColor ?? theme.colors.surfaceMuted },
      ]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: radius, overflow: 'hidden' },
          gradient ? null : { backgroundColor: color ?? theme.colors.primary },
          animatedStyle,
        ]}
      >
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});
