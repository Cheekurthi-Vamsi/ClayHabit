import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  progress,
  size = 88,
  strokeWidth = 10,
  color,
  trackColor,
  children,
}: ProgressRingProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const clamped = Math.max(0, Math.min(1, progress));
  const animatedProgress = useSharedValue(reduceMotion ? clamped : 0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  useEffect(() => {
    animatedProgress.value = reduceMotion
      ? clamped
      : withTiming(clamped, { duration: theme.motion.duration.slow });
  }, [animatedProgress, clamped, reduceMotion, theme.motion.duration.slow]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackColor ?? theme.colors.surfaceMuted}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color ?? theme.colors.primary}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: 'absolute' }}>{children}</View>
    </View>
  );
}
