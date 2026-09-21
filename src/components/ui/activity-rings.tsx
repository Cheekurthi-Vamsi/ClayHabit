import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ActivityRing {
  key: string;
  /** 0–1; anything above 1 is shown as a full ring. */
  progress: number;
  gradient: GradientStops;
  /** Track tint; defaults to the gradient's last stop. */
  color?: string;
}

interface ActivityRingsProps {
  /** Outermost first. */
  rings: readonly ActivityRing[];
  size?: number;
  thickness?: number;
  gap?: number;
  children?: React.ReactNode;
  accessibilityLabel: string;
}

function Ring({
  ring,
  index,
  center,
  radius,
  thickness,
}: {
  ring: ActivityRing;
  index: number;
  center: number;
  radius: number;
  thickness: number;
}) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const circumference = 2 * Math.PI * radius;
  const target = Math.max(0, Math.min(1, ring.progress));
  const progress = useSharedValue(reduceMotion ? target : 0);

  useEffect(() => {
    progress.value = reduceMotion
      ? target
      : withDelay(index * 120, withTiming(target, { duration: theme.motion.duration.slow + 200 }));
  }, [target, index, reduceMotion, progress, theme.motion.duration.slow]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.value),
  }));

  const tint = ring.color ?? ring.gradient[ring.gradient.length - 1];
  const gradientId = `ring-${index}`;

  return (
    <>
      <Defs>
        <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {ring.gradient.map((stop, stopIndex) => (
            <Stop key={stopIndex} offset={stopIndex / Math.max(1, ring.gradient.length - 1)} stopColor={stop} />
          ))}
        </LinearGradient>
      </Defs>
      <Circle cx={center} cy={center} r={radius} stroke={tint} strokeOpacity={0.16} strokeWidth={thickness} fill="none" />
      {target > 0 ? (
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      ) : null}
    </>
  );
}

/** Concentric progress rings, one per item — the Apple Activity look. */
export function ActivityRings({
  rings,
  size = 148,
  thickness = 13,
  gap = 4,
  children,
  accessibilityLabel,
}: ActivityRingsProps) {
  const center = size / 2;

  return (
    <View
      style={{ width: size, height: size }}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      <Svg width={size} height={size}>
        {rings.map((ring, index) => (
          <Ring
            key={ring.key}
            ring={ring}
            index={index}
            center={center}
            radius={center - thickness / 2 - index * (thickness + gap)}
            thickness={thickness}
          />
        ))}
      </Svg>
      {children ? <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
