import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from '@/lib/haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme } from '@/theme';

import { Icon, type IconName } from './icon';

export type IconButtonVariant = 'filled' | 'muted' | 'ghost';

interface IconButtonProps {
  name: IconName;
  onPress: () => void;
  variant?: IconButtonVariant;
  size?: number;
  accessibilityLabel: string;
  disabled?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function IconButton({
  name,
  onPress,
  variant = 'muted',
  size = 44,
  accessibilityLabel,
  disabled = false,
}: IconButtonProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.9 });
  const pressed = useSharedValue(0);
  const overlayStyle = useAnimatedStyle(() => ({ opacity: pressed.value }));

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressIn();
    pressed.value = withTiming(1, { duration: 90 });
  };

  const handlePressOut = () => {
    onPressOut();
    pressed.value = withTiming(0, { duration: 200 });
  };

  const iconColor = variant === 'filled' ? theme.colors.onPrimary : theme.colors.textPrimary;

  // Behind the icon on plain buttons (the tint is opaque); over the gradient on filled ones.
  const overlay = (
    <Animated.View
      pointerEvents="none"
      style={[
        StyleSheet.absoluteFill,
        {
          borderRadius: size / 2,
          backgroundColor:
            variant === 'filled' ? 'rgba(255,255,255,0.2)' : theme.colors.surfacePressed,
        },
        overlayStyle,
      ]}
    />
  );

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          opacity: disabled ? 0.5 : 1,
          backgroundColor: variant === 'muted' ? theme.colors.surfaceMuted : undefined,
        },
        animatedStyle,
      ]}
    >
      {variant === 'filled' ? null : overlay}
      {variant === 'filled' ? (
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: size / 2 }]}
        >
          <Icon name={name} size={size * 0.45} color={iconColor} />
          {overlay}
        </LinearGradient>
      ) : (
        <Icon name={name} size={size * 0.45} color={iconColor} />
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
