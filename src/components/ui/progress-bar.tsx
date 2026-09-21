import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

interface ProgressBarProps {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
}

export function ProgressBar({ progress, color, trackColor, height = 8 }: ProgressBarProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const width = useSharedValue(reduceMotion ? clamped : 0);

  useEffect(() => {
    width.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: theme.motion.duration.slow });
  }, [clamped, reduceMotion, theme.motion.duration.slow, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.colors.surfaceMuted,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          { height, borderRadius: height / 2, backgroundColor: color ?? theme.colors.primary },
          animatedStyle,
        ]}
      />
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
