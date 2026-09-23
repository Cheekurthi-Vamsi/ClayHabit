import { useCallback, useState } from 'react';
import * as Haptics from '@/lib/haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon, Text, type IconName } from '@/components/ui';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme, type GradientStops } from '@/theme';

export type AppEnvironment = 'productivity' | 'finance';

const PAD = 4;
const HEIGHT = 44;

/**
 * Moves between the two workspaces without resetting either. Finance is
 * pushed on top of the productivity tabs, so going back simply dismisses it
 * and productivity is exactly where it was left.
 */
export function useSwitchEnvironment() {
  const router = useRouter();
  return useCallback(
    (to: AppEnvironment) => {
      if (to === 'finance') {
        router.push('/finance');
      } else if (router.canDismiss()) {
        router.dismiss();
      } else {
        router.replace('/');
      }
    },
    [router],
  );
}

function Segment({
  label,
  icon,
  active,
  progress,
  index,
  onPress,
}: {
  label: string;
  icon: IconName;
  active: boolean;
  progress: ReturnType<typeof useSharedValue<number>>;
  index: 0 | 1;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  // Cross-fade a white (on-indicator) copy over a muted copy as the indicator arrives.
  const onIndicatorStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], index === 0 ? [1, 0] : [0, 1]),
  }));

  const content = (color: string) => (
    <>
      <Icon name={icon} size={16} color={color} />
      <Text variant="labelLarge" style={{ color }} numberOfLines={1}>
        {label}
      </Text>
    </>
  );

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`${label} workspace`}
      style={styles.segment}
    >
      <View style={styles.segmentContent}>{content(theme.colors.textSecondary)}</View>
      <Animated.View style={[styles.segmentContent, StyleSheet.absoluteFill, onIndicatorStyle]}>
        {content('#FFFFFF')}
      </Animated.View>
    </Pressable>
  );
}

export function EnvironmentSwitcher({ current }: { current: AppEnvironment }) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const switchTo = useSwitchEnvironment();
  const [width, setWidth] = useState(0);
  const position = current === 'finance' ? 1 : 0;
  const progress = useSharedValue(position);

  // This screen stays mounted underneath the other workspace; snap back when it's shown again.
  useFocusEffect(
    useCallback(() => {
      progress.value = position;
    }, [position, progress]),
  );

  const segmentWidth = width > 0 ? (width - PAD * 2) / 2 : 0;
  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * segmentWidth }],
  }));
  const productivityFill = useAnimatedStyle(() => ({ opacity: 1 - progress.value }));

  const select = (to: AppEnvironment) => {
    if (to === current) return;
    Haptics.selectionAsync();
    const target = to === 'finance' ? 1 : 0;
    progress.value = reduceMotion ? target : withTiming(target, { duration: 260 });
    switchTo(to);
  };

  const gradient = (colors: GradientStops) => (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
  );

  return (
    <View
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.colors.surfaceMuted }]}
    >
      {segmentWidth > 0 ? (
        <Animated.View style={[styles.indicator, { width: segmentWidth }, indicatorStyle]}>
          {/* The indicator's colour follows the workspace it's heading to. */}
          {gradient(theme.gradients.finance)}
          <Animated.View style={[StyleSheet.absoluteFill, productivityFill]}>
            {gradient(theme.gradients.primary)}
          </Animated.View>
        </Animated.View>
      ) : null}
      <Segment
        label="Productivity"
        icon="check-circle"
        active={current === 'productivity'}
        progress={progress}
        index={0}
        onPress={() => select('productivity')}
      />
      <Segment
        label="Finance"
        icon="credit-card"
        active={current === 'finance'}
        progress={progress}
        index={1}
        onPress={() => select('finance')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
    padding: PAD,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 320,
  },
  indicator: {
    position: 'absolute',
    top: PAD,
    bottom: PAD,
    left: PAD,
    borderRadius: (HEIGHT - PAD * 2) / 2,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
  },
  segmentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
});
