import { useEffect } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

import { Text } from './text';

const PARTICLES = 18;
const DURATION = 1400;
const PARTICLE_COLORS = ['#7258F5', '#3A74E6', '#27B893', '#F7C66B', '#E47A22'];

function Particle({ index }: { index: number }) {
  const progress = useSharedValue(0);
  const angle = (index / PARTICLES) * Math.PI * 2 + (index % 3) * 0.3;
  const distance = 90 + (index % 4) * 28;
  const size = 6 + (index % 3) * 3;

  useEffect(() => {
    progress.value = withDelay(
      (index % 5) * 25,
      withTiming(1, { duration: DURATION - 200, easing: Easing.out(Easing.cubic) }),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value + 40 * progress.value * progress.value },
      { scale: 1 - progress.value * 0.5 },
      { rotate: `${progress.value * 240}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: index % 2 === 0 ? size : size * 1.8,
          borderRadius: index % 2 === 0 ? size / 2 : 2,
          backgroundColor: PARTICLE_COLORS[index % PARTICLE_COLORS.length],
        },
        style,
      ]}
    />
  );
}

interface CelebrationProps {
  title: string;
  subtitle?: string;
  onDone: () => void;
}

/** A short, non-blocking burst for milestones. Touches pass straight through it. */
export function Celebration({ title, subtitle, onDone }: CelebrationProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const timer = setTimeout(onDone, DURATION + 900);
    return () => clearTimeout(timer);
    // One burst per mount: a new `onDone` identity from a parent re-render must not replay it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View pointerEvents="none" style={styles.overlay} accessibilityLiveRegion="polite">
      {!reduceMotion ? (
        <View style={styles.burst}>
          {Array.from({ length: PARTICLES }).map((_, index) => (
            <Particle key={index} index={index} />
          ))}
        </View>
      ) : null}
      <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(260)}>
        <LinearGradient
          colors={theme.gradients.aurora}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.toast, { borderRadius: theme.radii.xl }]}
        >
          <Text variant="titleLarge" style={styles.white} accessibilityRole="alert">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={styles.whiteMuted}>
              {subtitle}
            </Text>
          ) : null}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  burst: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
  },
  toast: {
    alignItems: 'center',
    paddingHorizontal: 26,
    paddingVertical: 16,
    gap: 2,
    shadowColor: '#5B4FE8',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  white: {
    color: '#FFFFFF',
  },
  whiteMuted: {
    color: 'rgba(255,255,255,0.88)',
  },
});
