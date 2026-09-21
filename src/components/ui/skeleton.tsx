import { useEffect } from 'react';
import type { DimensionValue } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

export function Skeleton({ width = '100%', height = 16, radius = 8 }: SkeletonProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 0.6;
      return;
    }
    opacity.value = withRepeat(
      withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [opacity, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceMuted },
        animatedStyle,
      ]}
    />
  );
}
