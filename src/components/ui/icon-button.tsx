import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

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
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.92 });

  const handlePressIn = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressIn();
  };

  const iconColor = variant === 'filled' ? theme.colors.onPrimary : theme.colors.textPrimary;

  return (
    <AnimatedPressable
      onPress={disabled ? undefined : onPress}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
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
      {variant === 'filled' ? (
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.fill, { borderRadius: size / 2 }]}
        >
          <Icon name={name} size={size * 0.45} color={iconColor} />
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
