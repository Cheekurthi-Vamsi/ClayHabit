import { useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useAppTheme } from '@/theme';

/** How far the face sits above its solid shadow; pressing pushes it all the way down. */
export const CARTOON_DEPTH = 4;
const SHINE_WIDTH = 64;

/** The ink used for outlines and the offset shadow (navy in light mode, near-black in dark). */
export function useInk(): string {
  const theme = useAppTheme();
  return theme.scheme === 'dark' ? '#04050C' : theme.colors.textPrimary;
}

interface CartoonPressProps {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  /** Draws the ink outline and the solid offset shadow. Off for ghost/glass styles. */
  raised?: boolean;
  /** Plays the diagonal highlight sweep across the face on press. */
  shine?: boolean;
  haptic?: 'light' | 'medium';
  radius: number;
  /** Face background: a solid colour or gradient stops. */
  fill?: string | readonly [string, string, ...string[]];
  borderColor?: string;
  pressedTint?: string;
  style?: StyleProp<ViewStyle>;
  faceStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityState?: { disabled?: boolean; busy?: boolean; selected?: boolean };
  accessibilityRole?: 'button' | 'radio' | 'switch' | 'tab';
  children: React.ReactNode;
}

/**
 * ClayHabbit's tactile press surface — the RN take on a "cartoon" button:
 * a 2px ink outline, a hard ink shadow a few points below, and a face that
 * sinks into that shadow when pressed (then springs back), with a light
 * sweep across it. Every button style is built on this so they all feel the same.
 */
export function CartoonPress({
  onPress,
  onLongPress,
  disabled = false,
  raised = true,
  shine = true,
  haptic = 'light',
  radius,
  fill,
  borderColor,
  pressedTint = 'rgba(255,255,255,0.14)',
  style,
  faceStyle,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityRole = 'button',
  children,
}: CartoonPressProps) {
  const ink = useInk();
  const reduceMotion = useReduceMotion();
  const press = useSharedValue(0);
  const sweep = useSharedValue(-1);
  const [width, setWidth] = useState(0);

  const depth = raised ? CARTOON_DEPTH : 0;

  const faceAnim = useAnimatedStyle(() => ({
    transform: [{ translateY: press.value * depth }, { scale: raised ? 1 : 1 - press.value * 0.03 }],
  }));
  const tintAnim = useAnimatedStyle(() => ({ opacity: press.value }));
  const shineAnim = useAnimatedStyle(() => ({
    opacity: sweep.value <= -1 || sweep.value >= 1 ? 0 : 1,
    transform: [{ translateX: sweep.value * (width / 2 + SHINE_WIDTH) }, { rotate: '14deg' }],
  }));

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(haptic === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    press.value = reduceMotion ? 1 : withTiming(1, { duration: 70 });
    if (shine && !reduceMotion) {
      sweep.value = -1;
      sweep.value = withTiming(1, { duration: 560, easing: Easing.inOut(Easing.quad) });
    }
  };
  const handlePressOut = () => {
    press.value = reduceMotion ? 0 : withSpring(0, { damping: 12, stiffness: 320, mass: 0.5 });
  };

  const faceBase: ViewStyle = {
    borderRadius: radius,
    borderWidth: raised ? 2 : 0,
    borderColor: borderColor ?? ink,
    overflow: 'hidden',
  };

  const faceContent = (
    <>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: pressedTint }, tintAnim]} />
      {shine ? (
        <Animated.View pointerEvents="none" style={[styles.shine, shineAnim]}>
          <View style={styles.shineBar} />
        </Animated.View>
      ) : null}
      {children}
    </>
  );

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      onLongPress={disabled ? undefined : onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, ...accessibilityState }}
      style={[{ paddingBottom: depth, opacity: disabled ? 0.5 : 1 }, style]}
    >
      {raised ? (
        <View pointerEvents="none" style={[styles.shadow, { top: depth, borderRadius: radius, backgroundColor: ink }]} />
      ) : null}
      <Animated.View style={faceAnim}>
        {Array.isArray(fill) ? (
          <LinearGradient
            colors={fill as readonly [string, string, ...string[]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[faceBase, faceStyle]}
          >
            {faceContent}
          </LinearGradient>
        ) : (
          <View style={[faceBase, { backgroundColor: (fill as string | undefined) ?? 'transparent' }, faceStyle]}>
            {faceContent}
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shadow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  shine: {
    position: 'absolute',
    top: -30,
    bottom: -30,
    left: '50%',
    marginLeft: -SHINE_WIDTH / 2,
    width: SHINE_WIDTH,
  },
  shineBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
});
