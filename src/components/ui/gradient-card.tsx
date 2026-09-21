import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme, type GradientStops } from '@/theme';

import { DecorativeOrbs, type OrbPattern } from './decorative-orbs';

interface GradientCardProps {
  gradient: GradientStops;
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  orbs?: OrbPattern | false;
  /** Colored glow under the card. Off for soft pastel surfaces where it would look muddy. */
  glow?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GradientCard({
  gradient,
  children,
  onPress,
  onLongPress,
  orbs = 'bubbles',
  glow = true,
  style,
  contentStyle,
  accessibilityLabel,
  accessibilityHint,
}: GradientCardProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.975 });
  const interactive = Boolean(onPress || onLongPress);

  const shadow: ViewStyle = glow
    ? {
        shadowColor: gradient[gradient.length - 1],
        shadowOpacity: theme.scheme === 'dark' ? 0.35 : 0.28,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
      }
    : {
        shadowColor: theme.colors.shadow,
        shadowOpacity: 1,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
      };

  return (
    <AnimatedPressable
      disabled={!interactive}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={() => {
        if (!interactive) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn();
      }}
      onPressOut={onPressOut}
      accessibilityRole={interactive ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      style={[styles.outer, { borderRadius: theme.radii.lg }, shadow, style, animatedStyle]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.fill, { borderRadius: theme.radii.lg }]}
      >
        {orbs ? <DecorativeOrbs pattern={orbs} /> : null}
        <View style={[styles.content, contentStyle]}>{children}</View>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    overflow: 'visible',
  },
  fill: {
    overflow: 'hidden',
    flexGrow: 1,
  },
  content: {
    padding: 18,
    flexGrow: 1,
  },
});
