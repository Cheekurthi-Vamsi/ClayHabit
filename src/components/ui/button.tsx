import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme, type GradientStops } from '@/theme';

import { CurvedDock } from './curved-dock';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/**
 * - `dock`: gradient fill with the curved inner dock — primary actions.
 * - `glass`: translucent white — for actions sitting on a gradient card.
 * - `outline` / `ghost`: secondary and tertiary actions.
 */
export type ButtonVariant = 'dock' | 'glass' | 'outline' | 'ghost';
export type ButtonSize = 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  gradient?: GradientStops;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'dock',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  gradient,
  accessibilityHint,
}: ButtonProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.96 });

  const isInteractive = !disabled && !loading;
  const padding = size === 'sm' ? styles.paddingSm : styles.paddingMd;

  const handlePressIn = () => {
    if (!isInteractive) return;
    Haptics.impactAsync(
      variant === 'dock' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light,
    );
    onPressIn();
  };

  const contentColor =
    variant === 'dock' || variant === 'glass' ? '#FFFFFF' : theme.colors.textPrimary;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={contentColor} /> : null}
          <Text variant="labelLarge" style={{ color: contentColor }} accessible={false}>
            {label}
          </Text>
        </>
      )}
    </View>
  );

  const containerStyle: ViewStyle = {
    ...styles.base,
    ...(fullWidth ? styles.fullWidth : null),
    borderRadius: theme.radii.xl,
    opacity: disabled ? 0.5 : 1,
    ...(variant === 'dock'
      ? {
          shadowColor: (gradient ?? theme.gradients.primary)[0],
          shadowOpacity: 0.35,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
        }
      : null),
  };

  let body: React.ReactNode;
  if (variant === 'dock') {
    body = (
      <LinearGradient
        colors={gradient ?? theme.gradients.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, padding, { borderRadius: theme.radii.xl }]}
      >
        <LinearGradient
          colors={['rgba(255,255,255,0.32)', 'rgba(255,255,255,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.topHighlight}
        />
        <CurvedDock />
        {content}
      </LinearGradient>
    );
  } else if (variant === 'glass') {
    body = (
      <View
        style={[
          styles.fill,
          padding,
          {
            borderRadius: theme.radii.xl,
            backgroundColor: 'rgba(255,255,255,0.22)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.35)',
          },
        ]}
      >
        <CurvedDock depth={0.08} />
        {content}
      </View>
    );
  } else {
    body = (
      <View
        style={[
          styles.fill,
          padding,
          { borderRadius: theme.radii.xl },
          variant === 'outline'
            ? { borderWidth: 1.5, borderColor: theme.colors.borderStrong }
            : null,
        ]}
      >
        {content}
      </View>
    );
  }

  return (
    <AnimatedPressable
      onPress={isInteractive ? onPress : undefined}
      onPressIn={handlePressIn}
      onPressOut={onPressOut}
      disabled={!isInteractive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !isInteractive }}
      style={[containerStyle, animatedStyle]}
    >
      {body}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  fill: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paddingMd: {
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  paddingSm: {
    paddingVertical: 11,
    paddingHorizontal: 18,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '55%',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
