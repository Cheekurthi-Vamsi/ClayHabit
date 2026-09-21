import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';

import { usePressScale } from '@/hooks/use-press-scale';
import { useAppTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Card({ children, onPress, style, accessibilityLabel }: CardProps) {
  const theme = useAppTheme();
  const { animatedStyle, onPressIn, onPressOut } = usePressScale({ scaleTo: 0.98 });

  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: theme.radii.lg,
      shadowColor: theme.colors.shadow,
    },
    style,
  ];

  if (!onPress) {
    return <View style={baseStyle}>{children}</View>;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPressIn();
      }}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[baseStyle, animatedStyle]}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    padding: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 2,
  },
});
