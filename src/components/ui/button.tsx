import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAppTheme, type GradientStops } from '@/theme';

import { CartoonPress, useInk } from './cartoon-press';
import { Icon, type IconName } from './icon';
import { Text } from './text';

/**
 * - `dock`: violet → blue fill, white label — the primary action on a screen.
 * - `soft`: lavender fill, ink label — confident secondary actions.
 * - `outline`: surface fill, ink outline — neutral secondary actions.
 * - `danger`: red fill — destructive actions (delete, reset).
 * - `glass`: translucent white, for actions sitting on a gradient card.
 * - `ghost`: text-only, tertiary actions and links.
 *
 * All but glass/ghost are "cartoon" buttons: ink outline, a solid shadow
 * below, and a face that presses down into it (see CartoonPress).
 */
export type ButtonVariant = 'dock' | 'glass' | 'soft' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  /** Shown after the label (e.g. `arrow-right`). */
  trailingIcon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  gradient?: GradientStops;
  accessibilityHint?: string;
}

const PADDING: Record<ButtonSize, { minHeight: number; paddingHorizontal: number }> = {
  lg: { minHeight: 56, paddingHorizontal: 26 },
  md: { minHeight: 50, paddingHorizontal: 22 },
  sm: { minHeight: 40, paddingHorizontal: 16 },
};

export function Button({
  label,
  onPress,
  variant = 'dock',
  size = 'md',
  icon,
  trailingIcon,
  loading = false,
  disabled = false,
  fullWidth = false,
  gradient,
  accessibilityHint,
}: ButtonProps) {
  const theme = useAppTheme();
  const ink = useInk();

  const isInteractive = !disabled && !loading;
  const raised = variant !== 'glass' && variant !== 'ghost';
  const onColor = variant === 'dock' || variant === 'danger' || variant === 'glass';
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  const fill =
    variant === 'dock'
      ? (gradient ?? theme.gradients.primary)
      : variant === 'danger'
        ? theme.colors.error
        : variant === 'soft'
          ? theme.colors.primaryMuted
          : variant === 'outline'
            ? theme.colors.surface
            : variant === 'glass'
              ? 'rgba(255,255,255,0.22)'
              : undefined;

  const contentColor = onColor ? '#FFFFFF' : variant === 'ghost' ? theme.colors.primary : theme.colors.textPrimary;

  return (
    <CartoonPress
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      raised={raised}
      shine={variant === 'dock' || variant === 'danger'}
      haptic={variant === 'dock' ? 'medium' : 'light'}
      radius={theme.radii.full}
      fill={fill}
      borderColor={variant === 'glass' ? 'rgba(255,255,255,0.45)' : ink}
      pressedTint={onColor ? 'rgba(255,255,255,0.16)' : theme.colors.surfacePressed}
      style={fullWidth ? styles.fullWidth : styles.hug}
      faceStyle={[styles.face, PADDING[size], variant === 'glass' ? styles.glassBorder : null]}
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ busy: loading }}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={contentColor} />
        ) : icon ? (
          <Icon name={icon} size={iconSize} color={contentColor} />
        ) : null}
        <Text
          variant={size === 'sm' ? 'labelLarge' : 'titleMedium'}
          style={[styles.label, { color: contentColor }, size === 'lg' ? styles.labelLg : null]}
          numberOfLines={1}
          accessible={false}
        >
          {label}
        </Text>
        {trailingIcon && !loading ? <Icon name={trailingIcon} size={iconSize} color={contentColor} /> : null}
      </View>
    </CartoonPress>
  );
}

const styles = StyleSheet.create({
  hug: {
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  face: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glassBorder: {
    borderWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  label: {
    fontFamily: 'Manrope_700Bold',
  },
  labelLg: {
    fontSize: 17,
  },
});
