import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { Icon, ProgressRing, Text } from '@/components/ui';
import type { Habit } from '@/domain/entities/habit';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { habitPalette, useAppTheme } from '@/theme';

interface HabitCheckButtonProps {
  habit: Pick<Habit, 'name' | 'color' | 'targetPerDay'>;
  count: number;
  onPress: () => void;
  onLongPress?: () => void;
  size?: number;
}

export function HabitCheckButton({ habit, count, onPress, onLongPress, size = 46 }: HabitCheckButtonProps) {
  const theme = useAppTheme();
  const reduceMotion = useReduceMotion();
  const swatch = habitPalette[habit.color];
  const target = Math.max(1, habit.targetPerDay);
  const done = count >= target;

  const scale = useSharedValue(1);
  const wasDone = useRef(done);

  useEffect(() => {
    if (done && !wasDone.current && !reduceMotion) {
      scale.value = withSequence(withSpring(1.18, { damping: 6, stiffness: 320 }), withSpring(1));
    }
    wasDone.current = done;
  }, [done, reduceMotion, scale]);

  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = () => {
    const willComplete = count + 1 >= target && !done;
    if (willComplete) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const label =
    target === 1
      ? `${habit.name}: ${done ? 'done' : 'not done'} today`
      : `${habit.name}: ${count} of ${target} today`;

  return (
    <Pressable
      onPress={handlePress}
      onLongPress={onLongPress}
      hitSlop={8}
      accessibilityRole={target === 1 ? 'checkbox' : 'button'}
      accessibilityState={target === 1 ? { checked: done } : undefined}
      accessibilityLabel={label}
      accessibilityHint={done ? 'Tap to clear today' : 'Tap to check in'}
    >
      <Animated.View style={[{ width: size, height: size }, popStyle]}>
        {done ? (
          <LinearGradient
            colors={swatch.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.fill, { borderRadius: size / 2, shadowColor: swatch.base }]}
          >
            <Icon name="check" size={size * 0.46} color="#FFFFFF" />
          </LinearGradient>
        ) : target > 1 ? (
          <ProgressRing
            progress={count / target}
            size={size}
            strokeWidth={4}
            color={swatch.base}
            trackColor={theme.colors.surfaceMuted}
          >
            <Text variant="labelMedium" style={{ color: count > 0 ? swatch.base : theme.colors.textTertiary }}>
              {count}
            </Text>
          </ProgressRing>
        ) : (
          <View
            style={[
              styles.fill,
              { borderRadius: size / 2, borderWidth: 2, borderColor: theme.colors.borderStrong },
            ]}
          >
            <Icon name="plus" size={size * 0.4} color={theme.colors.textTertiary} />
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
