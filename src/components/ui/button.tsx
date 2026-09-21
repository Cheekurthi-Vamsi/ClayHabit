import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme } from '@/theme';

import { Icon, type IconName } from './icon';
import { Text } from './text';

export type ButtonVariant = 'dock' | 'outline' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  gradient?: readonly [string, string];
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Button({
  label,
  onPress,
  variant = 'dock',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  gradient,
  accessibilityHint,
}: ButtonProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.97 });

  const isInteractive = !disabled && !loading;

  const handlePressIn = () => {
    if (!isInteractive) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPressIn();
  };

  const contentColor =
    variant === 'dock' ? theme.colors.onPrimary : theme.colors.textPrimary;

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator color={contentColor} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={18} color={contentColor} /> : null}
          <Text
            variant="labelLarge"
            style={{ color: contentColor }}
            accessible={false}
          >
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
  };

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
      {variant === 'dock' ? (
        <LinearGradient
          colors={gradient ?? theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.dockFill, { borderRadius: theme.radii.xl }]}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[
              styles.innerDockHighlight,
              { borderTopLeftRadius: theme.radii.xl, borderTopRightRadius: theme.radii.xl },
            ]}
          />
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.plainFill,
            variant === 'outline'
              ? { borderWidth: 1.5, borderColor: theme.colors.border }
              : null,
          ]}
        >
          {content}
        </View>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignSelf: 'flex-start',
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  dockFill: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plainFill: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDockHighlight: {
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
